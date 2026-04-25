// src/AuthGate.jsx — gates the app behind email/password sign-in.
//
// States:
//   init       — first paint, before getSession resolves
//   signin     — no session: render sign-in form (or password reset form)
//   recover    — Supabase password-recovery link active: render new-password form
//   checking   — session exists, verifying allowlist
//   notallowed — authenticated but not in allowed_emails: forced sign-out
//   ready      — render children (the app)
//
// Phase 1b note: when status === 'ready', children renders the existing App
// which still uses localStorage. Cloud-backed state migration happens in
// Phase 2+. AuthGate only handles the auth round-trip and access check here.

(function () {
  const { useState, useEffect, useRef } = React;

  function AuthGate({ children }) {
    const [status, setStatus] = useState('init');
    const [session, setSession] = useState(null);
    const [error, setError] = useState(null);
    const lastEvent = useRef(null);
    // Once we've verified a user's access, remember their id so subsequent
    // SDK events (TOKEN_REFRESHED, USER_UPDATED, focus-triggered re-validation)
    // don't bounce the UI back to "Checking access…".
    const verifiedUserId = useRef(null);
    // Dedupe parallel access checks for the same user. INITIAL_SESSION and
    // SIGNED_IN can fire back-to-back, both slipping past the verifiedUserId
    // check while still null; without this, both fire RPCs in parallel and the
    // slower one's timeout can sign the user out even after the fast one won.
    const checkInFlight = useRef(null);

    useEffect(() => {
      if (!window.cloud) {
        setError('Cloud module failed to load. Check vendor/supabase.js and src/cloud.jsx.');
        setStatus('signin');
        return;
      }

      // Supabase JS v2 fires INITIAL_SESSION on subscribe, then SIGNED_IN /
      // SIGNED_OUT / PASSWORD_RECOVERY / TOKEN_REFRESHED / USER_UPDATED.
      const subscription = window.cloud.sb.auth.onAuthStateChange(async (evt, sess) => {
        lastEvent.current = evt;

        if (evt === 'PASSWORD_RECOVERY') {
          setSession(sess);
          setStatus('recover');
          return;
        }

        if (!sess) {
          verifiedUserId.current = null;
          setSession(null);
          setStatus('signin');
          return;
        }

        // Same user we already verified — just refresh the session ref silently.
        if (verifiedUserId.current === sess.user.id) {
          setSession(sess);
          return;
        }

        // First time seeing this user (or a different user) — verify access.
        setSession(sess);
        // Dedupe: if we already have a check in flight for this same user,
        // skip silently. The original handler will set state when it resolves.
        if (checkInFlight.current === sess.user.id) {
          return;
        }
        checkInFlight.current = sess.user.id;
        setStatus('checking');
        try {
          const allowed = await window.cloud.isAllowedUser();
          if (!allowed) {
            setStatus('notallowed');
            return;
          }
          verifiedUserId.current = sess.user.id;
          setError(null);
          setStatus('ready');
        } catch (err) {
          // Timeout on a healthy session: don't bounce to sign-in (which is
          // both confusing and wrong — the user is signed in, just couldn't
          // reach the allowlist RPC). Stay on 'checking'; the next auth event
          // (TOKEN_REFRESHED, visibility change, etc.) will retry.
          if (/timed out/.test(String(err && err.message))) {
            console.warn('[AuthGate] access check timed out, awaiting next auth event:', err);
          } else {
            console.error('[AuthGate] access check failed:', err);
            setError('Could not reach the workspace. Check your connection.');
            setStatus('signin');
          }
        } finally {
          if (checkInFlight.current === sess.user.id) {
            checkInFlight.current = null;
          }
        }
      });

      return () => {
        try { subscription.data.subscription.unsubscribe(); } catch (e) { /* */ }
      };
    }, []);

    if (status === 'init') {
      return <CenteredMessage title="Loading…" />;
    }
    if (status === 'checking') {
      return <CenteredMessage title="Checking access…" sub={session?.user?.email} />;
    }
    if (status === 'recover') {
      return <RecoverPasswordScreen onDone={() => setStatus('checking')} />;
    }
    if (status === 'notallowed') {
      return <NotAllowedScreen email={session?.user?.email} />;
    }
    if (status === 'signin') {
      return <SignInScreen initialError={error} />;
    }
    // ready — wrap children in LoadingGate so cloud appState hydrates before
    // the app reads from useCloudState(). SaveStatusIndicator + Toasts render
    // outside the gate so they're visible during the brief skeleton flash.
    const SaveStatus = window.SaveStatusIndicator || (() => null);
    const Toasts     = window.CloudToasts          || (() => null);
    const Gate       = window.LoadingGate          || (({children}) => children);
    return (
      <React.Fragment>
        <SaveStatus />
        <Toasts />
        <Gate>{children}</Gate>
      </React.Fragment>
    );
  }

  // ─────────────────────────────────────────────
  // Screens
  // ─────────────────────────────────────────────

  function CenteredMessage({ title, sub, children }) {
    return (
      <div style={shell()}>
        <div style={card()}>
          <div style={hLabel()}>Architecture Schedule</div>
          <div style={hTitle()}>{title}</div>
          {sub ? <div style={hSub()}>{sub}</div> : null}
          {children}
        </div>
      </div>
    );
  }

  function SignInScreen({ initialError }) {
    const [mode, setMode] = useState('signin'); // 'signin' | 'reset'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [busy, setBusy] = useState(false);
    const [errMsg, setErrMsg] = useState(initialError || '');
    const [okMsg, setOkMsg] = useState('');

    useEffect(() => { setErrMsg(initialError || ''); }, [initialError]);

    async function onSubmit(e) {
      e.preventDefault();
      setBusy(true); setErrMsg(''); setOkMsg('');
      try {
        if (mode === 'signin') {
          await window.cloud.signIn(email.trim(), password);
          // onAuthStateChange will progress us to ready.
        } else {
          await window.cloud.resetPassword(email.trim());
          setOkMsg("Check your email for a password reset link.");
        }
      } catch (err) {
        setErrMsg(err && err.message ? err.message : String(err));
      } finally {
        setBusy(false);
      }
    }

    return (
      <div style={shell()}>
        <form style={card()} onSubmit={onSubmit}>
          <div style={hLabel()}>Architecture Schedule</div>
          <div style={hTitle()}>{mode === 'signin' ? 'Sign in' : 'Reset password'}</div>

          <label style={fieldLabel()}>
            Email
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={input()}
              autoFocus
            />
          </label>

          {mode === 'signin' ? (
            <label style={fieldLabel()}>
              Password
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={input()}
              />
            </label>
          ) : null}

          {errMsg ? <div style={errBox()}>{errMsg}</div> : null}
          {okMsg  ? <div style={okBox()}>{okMsg}</div>   : null}

          <button type="submit" disabled={busy} style={primaryBtn(busy)}>
            {busy ? '…' : (mode === 'signin' ? 'Sign in' : 'Send reset link')}
          </button>

          <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            {mode === 'signin' ? (
              <button type="button" onClick={() => { setMode('reset'); setErrMsg(''); setOkMsg(''); }}
                      style={linkBtn()}>Forgot password?</button>
            ) : (
              <button type="button" onClick={() => { setMode('signin'); setErrMsg(''); setOkMsg(''); }}
                      style={linkBtn()}>← Back to sign in</button>
            )}
          </div>
        </form>
      </div>
    );
  }

  function RecoverPasswordScreen({ onDone }) {
    const [pw1, setPw1] = useState('');
    const [pw2, setPw2] = useState('');
    const [busy, setBusy] = useState(false);
    const [errMsg, setErrMsg] = useState('');

    async function onSubmit(e) {
      e.preventDefault();
      if (pw1.length < 8) { setErrMsg('Password must be at least 8 characters.'); return; }
      if (pw1 !== pw2)    { setErrMsg('Passwords do not match.'); return; }
      setBusy(true); setErrMsg('');
      try {
        await window.cloud.updatePassword(pw1);
        onDone();
      } catch (err) {
        setErrMsg(err && err.message ? err.message : String(err));
      } finally {
        setBusy(false);
      }
    }

    return (
      <div style={shell()}>
        <form style={card()} onSubmit={onSubmit}>
          <div style={hLabel()}>Architecture Schedule</div>
          <div style={hTitle()}>Set a new password</div>

          <label style={fieldLabel()}>
            New password
            <input type="password" required value={pw1} onChange={e => setPw1(e.target.value)}
                   style={input()} autoFocus minLength={8} />
          </label>
          <label style={fieldLabel()}>
            Confirm password
            <input type="password" required value={pw2} onChange={e => setPw2(e.target.value)}
                   style={input()} minLength={8} />
          </label>

          {errMsg ? <div style={errBox()}>{errMsg}</div> : null}

          <button type="submit" disabled={busy} style={primaryBtn(busy)}>
            {busy ? '…' : 'Save new password'}
          </button>
        </form>
      </div>
    );
  }

  function NotAllowedScreen({ email }) {
    const [busy, setBusy] = useState(false);
    async function onSignOut() {
      setBusy(true);
      try { await window.cloud.signOut(); } finally { setBusy(false); }
    }
    return (
      <div style={shell()}>
        <div style={card()}>
          <div style={hLabel()}>Architecture Schedule</div>
          <div style={hTitle()}>Not authorised</div>
          <div style={hSub()}>
            <strong>{email}</strong> isn't on the workspace allowlist. Ask the workspace owner to add your email.
          </div>
          <button type="button" disabled={busy} onClick={onSignOut} style={primaryBtn(busy)}>
            {busy ? '…' : 'Sign out'}
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────
  // Inline styles — uses existing CSS vars from index.html
  // ─────────────────────────────────────────────
  function shell() {
    return {
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      background: 'var(--paper)',
    };
  }
  function card() {
    return {
      width: '100%',
      maxWidth: 380,
      background: 'var(--paper-2)',
      border: '1px solid var(--rule)',
      borderRadius: 4,
      padding: '32px 28px',
      boxShadow: 'var(--shadow)',
      display: 'flex',
      flexDirection: 'column',
    };
  }
  function hLabel() {
    return {
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      letterSpacing: '0.18em',
      textTransform: 'uppercase',
      color: 'var(--ink-3)',
      marginBottom: 12,
    };
  }
  function hTitle() {
    return {
      fontFamily: 'var(--font-serif)',
      fontWeight: 400,
      fontSize: 28,
      lineHeight: 1.15,
      color: 'var(--ink)',
      marginBottom: 4,
    };
  }
  function hSub() {
    return {
      fontSize: 14,
      color: 'var(--ink-3)',
      marginBottom: 20,
      lineHeight: 1.4,
    };
  }
  function fieldLabel() {
    return {
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      color: 'var(--ink-3)',
      marginTop: 16,
    };
  }
  function input() {
    return {
      padding: '10px 12px',
      fontFamily: 'var(--font-sans)',
      fontSize: 15,
      letterSpacing: 'normal',
      textTransform: 'none',
      color: 'var(--ink)',
      background: 'var(--paper)',
      border: '1px solid var(--rule-2)',
      borderRadius: 2,
      outline: 'none',
    };
  }
  function primaryBtn(disabled) {
    return {
      marginTop: 24,
      padding: '12px 16px',
      fontFamily: 'var(--font-sans)',
      fontSize: 14,
      fontWeight: 500,
      color: '#fff',
      background: disabled ? 'var(--ink-4)' : 'var(--accent)',
      border: 'none',
      borderRadius: 2,
      cursor: disabled ? 'wait' : 'pointer',
      transition: 'background 0.15s ease',
    };
  }
  function linkBtn() {
    return {
      background: 'none',
      border: 'none',
      padding: 0,
      color: 'var(--accent-ink)',
      cursor: 'pointer',
      fontSize: 13,
      textDecoration: 'underline',
    };
  }
  function errBox() {
    return {
      marginTop: 14,
      padding: '10px 12px',
      fontSize: 13,
      color: '#7a2412',
      background: 'rgba(184, 92, 58, 0.12)',
      border: '1px solid rgba(184, 92, 58, 0.3)',
      borderRadius: 2,
    };
  }
  function okBox() {
    return {
      marginTop: 14,
      padding: '10px 12px',
      fontSize: 13,
      color: '#1f5a2e',
      background: 'rgba(58, 138, 74, 0.12)',
      border: '1px solid rgba(58, 138, 74, 0.3)',
      borderRadius: 2,
    };
  }

  Object.assign(window, { AuthGate });
})();
