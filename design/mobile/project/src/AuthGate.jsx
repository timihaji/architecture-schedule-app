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

  // Access-check cache: skip the is_allowed_user RPC on reload once we've
  // verified a user. Cuts ~one round-trip (Tokyo region → AU = ~250ms minimum,
  // first-request cold start can be much worse). Background revalidation on
  // each load catches removed users on their next reload; RLS catches them
  // immediately on any actual data access regardless.
  const ACCESS_CACHE_KEY = (uid) => 'aml-access-allowed:' + uid;
  function readAccessCache(uid) {
    try { return localStorage.getItem(ACCESS_CACHE_KEY(uid)) === '1'; } catch (_) { return false; }
  }
  function writeAccessCache(uid) {
    try { localStorage.setItem(ACCESS_CACHE_KEY(uid), '1'); } catch (_) { /* quota/disabled */ }
  }
  function clearAccessCache(uid) {
    try { localStorage.removeItem(ACCESS_CACHE_KEY(uid)); } catch (_) { /* */ }
  }

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

        // Cache hit: greenlight immediately, revalidate in background. The
        // user was previously verified on this device — likely still allowed.
        // If the verdict has flipped (removed from allowlist), revalidation
        // clears the cache and boots them to the notallowed screen.
        if (readAccessCache(sess.user.id)) {
          verifiedUserId.current = sess.user.id;
          setError(null);
          setStatus('ready');
          window.cloud.isAllowedUser().then(allowed => {
            if (!allowed) {
              clearAccessCache(sess.user.id);
              verifiedUserId.current = null;
              setStatus('notallowed');
            }
          }).catch(err => {
            // Network/timeout: keep the cache, keep the user in the app.
            console.warn('[AuthGate] background revalidation failed (cache kept):', err);
          });
          return;
        }

        checkInFlight.current = sess.user.id;
        setStatus('checking');
        try {
          const allowed = await window.cloud.isAllowedUser();
          if (!allowed) {
            clearAccessCache(sess.user.id);
            setStatus('notallowed');
            return;
          }
          writeAccessCache(sess.user.id);
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
      return <CenteredMessage title="Loading…" showProgress />;
    }
    if (status === 'checking') {
      return <CenteredMessage title="Checking access…" sub={session?.user?.email} showProgress />;
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
    // the app reads from useCloudState(). SaveStatusIndicator now renders
    // inline inside RevisionBadge (the lower bar). Toasts stay top-level.
    const Toasts = window.CloudToasts || (() => null);
    const Gate   = window.LoadingGate || (({children}) => children);
    return (
      <React.Fragment>
        <Toasts />
        <Gate>{children}</Gate>
      </React.Fragment>
    );
  }

  // ─────────────────────────────────────────────
  // Screens
  // ─────────────────────────────────────────────

  function CenteredMessage({ title, sub, children, showProgress }) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <div className="auth-eyebrow">Architecture Schedule</div>
          <div className="auth-title">{title}</div>
          {sub ? <div className="auth-sub">{sub}</div> : null}
          {showProgress ? (
            <div className="auth-progress"><div className="auth-progress-bar" /></div>
          ) : null}
          {children}
        </div>
      </div>
    );
  }

  function SignInScreen({ initialError }) {
    const [mode, setMode] = useState('signin'); // 'signin' | 'signup' | 'reset'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [password2, setPassword2] = useState('');
    const [busy, setBusy] = useState(false);
    const [errMsg, setErrMsg] = useState(initialError || '');
    const [okMsg, setOkMsg] = useState('');

    useEffect(() => { setErrMsg(initialError || ''); }, [initialError]);

    function switchMode(next) {
      setMode(next);
      setErrMsg('');
      setOkMsg('');
      setPassword2('');
    }

    async function onSubmit(e) {
      e.preventDefault();
      if (mode === 'signup') {
        if (password.length < 8) { setErrMsg('Password must be at least 8 characters.'); return; }
        if (password !== password2) { setErrMsg('Passwords do not match.'); return; }
      }
      setBusy(true); setErrMsg(''); setOkMsg('');
      try {
        if (mode === 'signin') {
          await window.cloud.signIn(email.trim(), password);
          // onAuthStateChange will progress us to ready.
        } else if (mode === 'signup') {
          const trimmed = email.trim();
          await window.cloud.signUp(trimmed, password);
          setOkMsg(`Check ${trimmed} for a confirmation link. Once confirmed, ask the workspace owner to grant you access.`);
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

    const title = mode === 'signin' ? 'Sign in'
                : mode === 'signup' ? 'Create account'
                : 'Reset password';
    const submitLabel = mode === 'signin' ? 'Sign in'
                      : mode === 'signup' ? 'Create account'
                      : 'Send reset link';

    return (
      <div className="auth-shell">
        <form className="auth-card" onSubmit={onSubmit}>
          <div className="auth-eyebrow">Architecture Schedule</div>
          <div className="auth-title">{title}</div>

          <label className="auth-field">
            Email
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="auth-input"
              autoFocus
            />
          </label>

          {mode !== 'reset' ? (
            <label className="auth-field">
              Password
              <input
                type="password"
                required
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="auth-input"
                minLength={mode === 'signup' ? 8 : undefined}
              />
            </label>
          ) : null}

          {mode === 'signup' ? (
            <label className="auth-field">
              Confirm password
              <input
                type="password"
                required
                autoComplete="new-password"
                value={password2}
                onChange={e => setPassword2(e.target.value)}
                className="auth-input"
                minLength={8}
              />
            </label>
          ) : null}

          {errMsg ? <div className="auth-err">{errMsg}</div> : null}
          {okMsg  ? <div className="auth-ok">{okMsg}</div>   : null}

          <button type="submit" disabled={busy} className="auth-submit">
            {busy ? '…' : submitLabel}
          </button>

          <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between' }}>
            {mode === 'signin' ? (
              <>
                <button type="button" onClick={() => switchMode('reset')}
                        className="auth-link-btn">Forgot password?</button>
                <button type="button" onClick={() => switchMode('signup')}
                        className="auth-link-btn">Create an account</button>
              </>
            ) : (
              <button type="button" onClick={() => switchMode('signin')}
                      className="auth-link-btn">← Back to sign in</button>
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
      <div className="auth-shell">
        <form className="auth-card" onSubmit={onSubmit}>
          <div className="auth-eyebrow">Architecture Schedule</div>
          <div className="auth-title">Set a new password</div>

          <label className="auth-field">
            New password
            <input type="password" required value={pw1} onChange={e => setPw1(e.target.value)}
                   className="auth-input" autoFocus minLength={8} />
          </label>
          <label className="auth-field">
            Confirm password
            <input type="password" required value={pw2} onChange={e => setPw2(e.target.value)}
                   className="auth-input" minLength={8} />
          </label>

          {errMsg ? <div className="auth-err">{errMsg}</div> : null}

          <button type="submit" disabled={busy} className="auth-submit">
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
      <div className="auth-shell">
        <div className="auth-card">
          <div className="auth-eyebrow">Architecture Schedule</div>
          <div className="auth-title">Not authorised</div>
          <div className="auth-sub">
            <strong>{email}</strong> isn't on the workspace allowlist. Ask the workspace owner to add your email.
          </div>
          <button type="button" disabled={busy} onClick={onSignOut} className="auth-submit">
            {busy ? '…' : 'Sign out'}
          </button>
        </div>
      </div>
    );
  }

  Object.assign(window, { AuthGate });
})();
