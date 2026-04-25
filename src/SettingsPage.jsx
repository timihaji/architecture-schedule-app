// SettingsPage — dedicated view, left-rail navigation, live preview.
// Each section is a component in this file. Changes apply immediately
// and persist to cloud via setSettings / setUi.

function SettingsPage({
  settings, setSettings,
  materials, projects, libraries, labelTemplates,
  onRestoreSeed, onImport, onClose,
}) {
  const cs = window.useCloudState();
  const section = cs.ui.settingsSection || 'appearance';
  const setSection = React.useCallback(
    (v) => cs.setUi({ settingsSection: v }),
    [cs.setUi],
  );

  // Shortcut helper
  function set(key, value) {
    setSettings(s => ({ ...s, [key]: value }));
  }

  const sections = [
    { key: 'firm',       label: 'Firm',       num: '01', group: 'Style' },
    { key: 'appearance', label: 'Appearance', num: '02', group: 'Style' },
    { key: 'typography', label: 'Typography', num: '03', group: 'Style' },
    { key: 'density',    label: 'Density',    num: '04', group: 'Style' },
    { key: 'layout',     label: 'Layout',     num: '05', group: 'Style' },
    { key: 'library',    label: 'Library defaults',  num: '06', group: 'Defaults' },
    { key: 'codes',      label: 'Codes & duplicates', num: '07', group: 'Defaults' },
    { key: 'projects',   label: 'Project defaults',  num: '08', group: 'Defaults' },
    { key: 'cloud',      label: 'Cloud',      num: '09', group: 'System' },
    { key: 'data',       label: 'Data',       num: '10', group: 'System' },
    { key: 'keyboard',   label: 'Keyboard',   num: '11', group: 'System' },
    { key: 'about',      label: 'About',      num: '12', group: 'System' },
  ];
  const groups = [...new Set(sections.map(s => s.group))];

  const sectionProps = { settings, set, setSettings,
    materials, projects, libraries, labelTemplates,
    onRestoreSeed, onImport };

  return (
    <div data-screen-label="Settings" style={{
      display: 'grid',
      gridTemplateColumns: '260px 1fr',
      gap: 64,
      minHeight: 'calc(100vh - 140px)',
    }}>
      {/* ───────── Left rail ───────── */}
      <aside style={{
        borderRight: '1px var(--rule-style, solid) var(--rule)',
        paddingRight: 32,
      }}>
        <div style={{ marginBottom: 28 }}>
          <Eyebrow>Section</Eyebrow>
          <Serif size={32} style={{ marginTop: 6, display: 'block', lineHeight: 1.05 }}>
            Settings
          </Serif>
          <div style={{ marginTop: 6, ...ui.serif, fontStyle: 'italic',
            fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.4 }}>
            Customise the studio archive. Changes apply immediately and are
            kept in your browser.
          </div>
        </div>

        {groups.map(g => (
          <div key={g} style={{ marginBottom: 22 }}>
            <div style={{ ...ui.mono, fontSize: 9, color: 'var(--ink-4)',
              letterSpacing: '0.14em', textTransform: 'uppercase',
              marginBottom: 8, paddingBottom: 6,
              borderBottom: '1px dotted var(--rule-2)' }}>
              {g}
            </div>
            <nav style={{ display: 'flex', flexDirection: 'column' }}>
              {sections.filter(s => s.group === g).map(s => {
                const active = section === s.key;
                return (
                  <button key={s.key} type="button"
                    onClick={() => setSection(s.key)}
                    style={{
                      background: active ? 'var(--tint)' : 'transparent',
                      border: 'none',
                      borderLeft: '2px solid ' + (active ? 'var(--accent)' : 'transparent'),
                      padding: '8px 10px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'baseline', gap: 10,
                      color: active ? 'var(--ink)' : 'var(--ink-3)',
                      fontFamily: "'Inter Tight', var(--font-sans, system-ui), sans-serif",
                      fontSize: 13,
                      fontWeight: active ? 500 : 400,
                    }}>
                    <span style={{ ...ui.mono, fontSize: 9.5,
                      color: active ? 'var(--ink-3)' : 'var(--ink-4)' }}>
                      {s.num}
                    </span>
                    {s.label}
                  </button>
                );
              })}
            </nav>
          </div>
        ))}
      </aside>

      {/* ───────── Right pane ───────── */}
      <div style={{ paddingRight: 8, paddingBottom: 60 }}>
        {section === 'firm'       && <FirmSection {...sectionProps} />}
        {section === 'appearance' && <AppearanceSection {...sectionProps} />}
        {section === 'typography' && <TypographySection {...sectionProps} />}
        {section === 'density'    && <DensitySection {...sectionProps} />}
        {section === 'layout'     && <LayoutSection {...sectionProps} />}
        {section === 'library'    && <LibraryDefaultsSection {...sectionProps} />}
        {section === 'codes'      && <CodesSection {...sectionProps} />}
        {section === 'projects'   && <ProjectDefaultsSection {...sectionProps} />}
        {section === 'cloud'      && <CloudSection {...sectionProps} />}
        {section === 'data'       && <DataSection {...sectionProps} />}
        {section === 'keyboard'   && <KeyboardSection {...sectionProps} />}
        {section === 'about'      && <AboutSection {...sectionProps} />}
      </div>
    </div>
  );
}

// ─────────────── Shared section primitives ───────────────

function SectionHeader({ kicker, title, subtitle }) {
  return (
    <div style={{
      marginBottom: 32, paddingBottom: 18,
      borderBottom: '1px var(--rule-style, solid) var(--rule)',
    }}>
      {kicker && <Eyebrow>{kicker}</Eyebrow>}
      <Serif size={34} style={{ marginTop: 6, display: 'block',
        lineHeight: 1.1, letterSpacing: '-0.01em' }}>
        {title}
      </Serif>
      {subtitle && (
        <div style={{ marginTop: 10, ...ui.serif, fontStyle: 'italic',
          fontSize: 15, color: 'var(--ink-3)', lineHeight: 1.45, maxWidth: 620 }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}

function SubRow({ label, children }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 24, alignItems: 'center' }}>
      <div style={{ fontSize: 12, color: 'var(--ink-2)', fontFamily: 'var(--font-sans)' }}>{label}</div>
      <div>{children}</div>
    </div>
  );
}

function SettingRow({ label, description, children }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '240px 1fr',
      gap: 40,
      padding: '22px 0',
      borderBottom: '1px dotted var(--rule-2)',
      alignItems: 'start',
    }}>
      <div>
        <div style={{ ...ui.label, color: 'var(--ink)', marginBottom: 5 }}>{label}</div>
        {description && (
          <div style={{ ...ui.serif, fontStyle: 'italic',
            fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.4 }}>
            {description}
          </div>
        )}
      </div>
      <div style={{ minWidth: 0 }}>{children}</div>
    </div>
  );
}

function SubsectionHeader({ children }) {
  return (
    <div style={{
      ...ui.mono, fontSize: 10, color: 'var(--ink-4)',
      letterSpacing: '0.14em', textTransform: 'uppercase',
      marginTop: 44, marginBottom: 4,
      paddingBottom: 10, borderBottom: '1px solid var(--rule)',
    }}>{children}</div>
  );
}

// Segmented option bar (reusable)
function Segmented({ options, value, onChange }) {
  return (
    <div style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 0 }}>
      {options.map((o, i) => {
        const active = value === o.key;
        return (
          <button key={o.key} type="button"
            onClick={() => onChange(o.key)}
            style={{
              padding: '7px 14px',
              border: '1px solid ' + (active ? 'var(--ink)' : 'var(--rule-2)'),
              borderLeft: i === 0 || active
                ? '1px solid ' + (active ? 'var(--ink)' : 'var(--rule-2)')
                : 'none',
              background: active ? 'var(--ink)' : 'transparent',
              color: active ? 'var(--paper)' : 'var(--ink-3)',
              fontFamily: "'Inter Tight', var(--font-sans, system-ui), sans-serif",
              fontSize: 11.5, letterSpacing: '0.04em',
              cursor: 'pointer', fontWeight: 500,
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
            {o.label}
            {o.meta && (
              <span style={{ ...ui.mono, fontSize: 9,
                opacity: active ? 0.7 : 0.5 }}>{o.meta}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─────────────── Appearance ───────────────

function AppearanceSection({ settings, set }) {
  const theme = SETTINGS_THEMES.find(t => t.key === settings.theme) || SETTINGS_THEMES[0];
  const isDark = !!theme.dark;

  return (
    <>
      <SectionHeader kicker="02" title="Appearance"
        subtitle="Theme, accent colour, and the supporting details — rule style, swatch shape, row stripes." />

      <SettingRow label="Theme"
        description="Paper tone, ink weight, and overall character. Sepia is low-contrast; High contrast is AAA.">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 10, maxWidth: 640 }}>
          {SETTINGS_THEMES.map(t => {
            const active = settings.theme === t.key;
            return (
              <button key={t.key} type="button"
                onClick={() => set('theme', t.key)}
                style={{
                  padding: 0,
                  background: t.preview.paper,
                  border: '1px solid ' + (active ? 'var(--ink)' : 'var(--rule-2)'),
                  boxShadow: active ? '0 0 0 1px var(--ink)' : 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  position: 'relative',
                  overflow: 'hidden',
                }}>
                {/* Tiny type specimen on the paper */}
                <div style={{ padding: '14px 14px 10px', color: t.preview.ink }}>
                  <div style={{ fontFamily: "'Newsreader', serif",
                    fontSize: 17, lineHeight: 1.1, marginBottom: 4 }}>
                    Archive
                  </div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 8.5, letterSpacing: '0.14em',
                    textTransform: 'uppercase', opacity: 0.6 }}>
                    CMP·01 · 240g
                  </div>
                  <div style={{ marginTop: 10, display: 'flex', gap: 4, alignItems: 'center' }}>
                    <div style={{ width: 14, height: 14,
                      background: t.preview.accent,
                      outline: '1px solid rgba(0,0,0,0.08)',
                      borderRadius: 'var(--swatch-radius, 0)',
                    }} />
                    <div style={{ flex: 1, height: 1, background: t.preview.ink, opacity: 0.2 }} />
                  </div>
                </div>
                <div style={{
                  padding: '7px 10px',
                  borderTop: '1px solid ' + (active ? 'var(--ink)' : 'var(--rule-2)'),
                  background: active ? 'var(--ink)' : 'var(--paper)',
                  color: active ? 'var(--paper)' : 'var(--ink)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                }}>
                  <span style={{ fontFamily: "'Inter Tight', sans-serif",
                    fontSize: 11, fontWeight: 500, letterSpacing: '0.04em' }}>
                    {t.label}
                  </span>
                  <span style={{ ...ui.mono, fontSize: 9,
                    opacity: active ? 0.7 : 0.5, letterSpacing: '0.1em' }}>
                    {t.dark ? 'DARK' : 'LIGHT'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </SettingRow>

      {settings.theme === 'light' && (
        <SettingRow label="Paper tone"
          description="Fine-tune the paper colour within the Light theme only.">
          <div style={{ display: 'flex', gap: 8 }}>
            {SETTINGS_PAPERS.map(p => {
              const active = settings.paper === p.key;
              return (
                <button key={p.key} type="button"
                  onClick={() => set('paper', p.key)}
                  style={{
                    padding: 0,
                    width: 58, height: 58,
                    background: p.preview,
                    border: '1px solid ' + (active ? 'var(--ink)' : 'var(--rule-2)'),
                    boxShadow: active ? '0 0 0 1px var(--ink)' : 'none',
                    cursor: 'pointer',
                    position: 'relative',
                  }}>
                  <span style={{ position: 'absolute', bottom: 4, left: 6,
                    fontFamily: "'Inter Tight', sans-serif",
                    fontSize: 9.5, letterSpacing: '0.06em',
                    color: 'rgba(20,20,20,0.6)' }}>
                    {p.label}
                  </span>
                </button>
              );
            })}
          </div>
        </SettingRow>
      )}

      <SettingRow label="Accent colour"
        description="Used for hovers, active states, and the occasional emphasis. Shade auto-adjusts for dark themes.">
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {SETTINGS_ACCENTS.map(a => {
            const active = settings.accent === a.key;
            const swatchColor = isDark ? a.dark.accent : a.light.accent;
            return (
              <button key={a.key} type="button"
                onClick={() => set('accent', a.key)}
                style={{
                  padding: 0,
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                  gap: 5, minWidth: 68,
                }}>
                <div style={{
                  width: 52, height: 52,
                  background: swatchColor,
                  outline: active ? '2px solid var(--ink)' : '1px solid var(--rule-2)',
                  outlineOffset: active ? 2 : 0,
                  borderRadius: 'var(--swatch-radius, 0)',
                }} />
                <span style={{ ...ui.mono, fontSize: 9.5,
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                  color: active ? 'var(--ink)' : 'var(--ink-4)' }}>
                  {a.label}
                </span>
              </button>
            );
          })}
        </div>
      </SettingRow>

      <SettingRow label="Rule style"
        description="The look of horizontal dividers throughout the interface.">
        <Segmented value={settings.ruleStyle} onChange={v => set('ruleStyle', v)}
          options={SETTINGS_RULE_STYLES.map(r => ({ key: r.key, label: r.label }))} />
        <div style={{ marginTop: 14, maxWidth: 420 }}>
          <div style={{
            fontFamily: "'Newsreader', var(--font-serif, serif)",
            fontSize: 14, color: 'var(--ink-3)', fontStyle: 'italic',
          }}>— preview —</div>
          <div style={{
            borderTop: settings.ruleStyle === 'none' ? '0' :
              '1px ' + (SETTINGS_RULE_STYLES.find(r => r.key === settings.ruleStyle)?.style || 'solid') + ' var(--rule)',
            height: 0, margin: '8px 0',
          }} />
          <div style={{
            fontFamily: "'Newsreader', var(--font-serif, serif)",
            fontSize: 14, color: 'var(--ink-3)', fontStyle: 'italic',
          }}>— preview —</div>
        </div>
      </SettingRow>

      <SettingRow label="Swatch shape"
        description="The shape of material colour chips and paint squares across the app.">
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {SETTINGS_SWATCH_SHAPES.map(s => {
            const active = settings.swatchShape === s.key;
            return (
              <button key={s.key} type="button"
                onClick={() => set('swatchShape', s.key)}
                style={{
                  background: 'transparent', border: 'none', padding: 8,
                  cursor: 'pointer',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', gap: 6,
                  outline: active ? '1px solid var(--ink)' : '1px solid var(--rule-2)',
                }}>
                <div style={{
                  width: 36, height: 36,
                  background: 'var(--accent)',
                  borderRadius: s.radius,
                }} />
                <span style={{ ...ui.mono, fontSize: 9,
                  letterSpacing: '0.08em',
                  color: active ? 'var(--ink)' : 'var(--ink-4)' }}>
                  {s.label}
                </span>
              </button>
            );
          })}
        </div>
      </SettingRow>

      <SettingRow label="Row stripes"
        description="Adds a subtle zebra stripe to long tables and lists for easier scanning.">
        <Toggle value={settings.stripes}
          onChange={v => set('stripes', v)}
          onLabel="On" offLabel="Off" />
      </SettingRow>

      <SettingRow label="Show swatches in lists"
        description="Gallery and table rows render a miniature swatch. Turn off for an even tighter spec-book feel.">
        <Toggle value={settings.showImagery}
          onChange={v => set('showImagery', v)}
          onLabel="Visible" offLabel="Hidden" />
      </SettingRow>
    </>
  );
}

// ─────────────── Typography ───────────────

function TypographySection({ settings, set }) {
  return (
    <>
      <SectionHeader kicker="03" title="Typography"
        subtitle="Choose a typeface preset. Each preset sets the serif, sans, and monospace faces used across the interface." />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {SETTINGS_TYPEFACES.map(tf => {
          const active = settings.typeface === tf.key;
          return (
            <button key={tf.key} type="button"
              onClick={() => set('typeface', tf.key)}
              style={{
                padding: '22px 26px',
                background: active ? 'var(--tint)' : 'transparent',
                border: '1px solid ' + (active ? 'var(--ink)' : 'var(--rule-2)'),
                cursor: 'pointer',
                textAlign: 'left',
                display: 'grid',
                gridTemplateColumns: '1fr 260px',
                gap: 32, alignItems: 'center',
              }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline',
                  justifyContent: 'space-between', gap: 14, marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                    <span style={{ ...ui.mono, fontSize: 10,
                      color: active ? 'var(--ink-3)' : 'var(--ink-4)',
                      letterSpacing: '0.1em' }}>
                      {String(SETTINGS_TYPEFACES.indexOf(tf) + 1).padStart(2, '0')}
                    </span>
                    <span style={{ fontFamily: tf.sans, fontSize: 14, fontWeight: 500,
                      color: 'var(--ink)', letterSpacing: '0.02em' }}>
                      {tf.label}
                    </span>
                  </div>
                  {active && <Tag tone="accent">Active</Tag>}
                </div>
                <div style={{ fontFamily: tf.serif, fontSize: 32,
                  color: 'var(--ink)', lineHeight: 1.05, letterSpacing: '-0.01em',
                  marginBottom: 4 }}>
                  {tf.sample}
                </div>
                <div style={{ fontFamily: tf.sans, fontSize: 13,
                  color: 'var(--ink-3)', fontWeight: 400 }}>
                  {tf.description}
                </div>
                <div style={{ marginTop: 8, fontFamily: tf.mono, fontSize: 11,
                  color: 'var(--ink-4)', letterSpacing: '0.06em' }}>
                  CMP·01 / 240·g·m² / A$4.80
                </div>
              </div>
              <div style={{ paddingLeft: 24,
                borderLeft: '1px dotted var(--rule-2)' }}>
                <div style={{ ...ui.mono, fontSize: 9, color: 'var(--ink-4)',
                  letterSpacing: '0.1em', marginBottom: 6 }}>SERIF</div>
                <div style={{ fontFamily: tf.serif, fontSize: 16,
                  color: 'var(--ink-2)', marginBottom: 12 }}>
                  Aa Bb Cc · 1234567890
                </div>
                <div style={{ ...ui.mono, fontSize: 9, color: 'var(--ink-4)',
                  letterSpacing: '0.1em', marginBottom: 6 }}>SANS</div>
                <div style={{ fontFamily: tf.sans, fontSize: 14,
                  color: 'var(--ink-2)', marginBottom: 12 }}>
                  Aa Bb Cc · 1234567890
                </div>
                <div style={{ ...ui.mono, fontSize: 9, color: 'var(--ink-4)',
                  letterSpacing: '0.1em', marginBottom: 6 }}>MONO</div>
                <div style={{ fontFamily: tf.mono, fontSize: 12,
                  color: 'var(--ink-2)' }}>
                  Aa · 1234567890
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}

// ─────────────── Density ───────────────

function DensitySection({ settings, set }) {
  return (
    <>
      <SectionHeader kicker="04" title="Density"
        subtitle="How much air there is between rows. Compact shows more at once; Open breathes." />

      <SettingRow label="Row density"
        description="Affects both Gallery and Table modes.">
        <Segmented value={settings.density} onChange={v => set('density', v)}
          options={SETTINGS_DENSITIES} />
        <div style={{ marginTop: 24 }}>
          <Eyebrow style={{ marginBottom: 10 }}>Preview</Eyebrow>
          <DensityPreview density={settings.density} />
        </div>
      </SettingRow>
    </>
  );
}

function DensityPreview({ density }) {
  const pads = { compact: 7, regular: 11, open: 15 };
  const pad = pads[density] || 11;
  return (
    <div style={{
      maxWidth: 540,
      border: '1px solid var(--rule)',
    }}>
      {[
        { c: 'CMP·01', n: 'Oregon Ash', m: 'Varga & Co · Oregon' },
        { c: 'CMP·02', n: 'Blackbutt',  m: 'TasTimbers · TAS' },
        { c: 'CMP·03', n: 'Spotted Gum', m: 'Varga & Co · NSW' },
      ].map((row, i) => (
        <div key={i} style={{
          padding: pad + 'px 14px',
          display: 'grid',
          gridTemplateColumns: '80px 1fr auto',
          alignItems: 'center',
          gap: 14,
          borderBottom: i < 2 ? '1px dotted var(--rule-2)' : 'none',
        }}>
          <span style={{ ...ui.mono, fontSize: 10, color: 'var(--ink-4)' }}>{row.c}</span>
          <span style={{ ...ui.serif, fontSize: 15 }}>{row.n}</span>
          <span style={{ ...ui.serif, fontSize: 12, color: 'var(--ink-3)', fontStyle: 'italic' }}>{row.m}</span>
        </div>
      ))}
    </div>
  );
}

// ─────────────── Layout ───────────────

function LayoutSection({ settings, set }) {
  return (
    <>
      <SectionHeader kicker="05" title="Layout"
        subtitle="The width of the Library Gallery. Table mode is always full-bleed; Cost Schedule sets its own measure." />

      <SettingRow label="Gallery width"
        description="The maximum content width for Library Gallery mode.">
        <Segmented value={settings.galleryWidth} onChange={v => set('galleryWidth', v)}
          options={SETTINGS_GALLERY_WIDTHS.map(g => ({
            key: g.key, label: g.label, meta: g.w ? g.w + 'px' : '100%',
          }))} />
      </SettingRow>
    </>
  );
}

// ─────────────── Library defaults ───────────────

function FirmSection({ settings, set }) {
  const logoType = settings.firmLogoType || 'default';
  const fileRef = React.useRef(null);
  const [uploadError, setUploadError] = React.useState('');

  function handleFile(file) {
    setUploadError('');
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setUploadError('Please choose an image file.'); return;
    }
    if (file.size > 200 * 1024) {
      setUploadError('Image is over 200 KB — use a smaller file.'); return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      set('firmLogoData', reader.result);
      set('firmLogoType', 'upload');
    };
    reader.readAsDataURL(file);
  }

  const glyphs = window.FIRM_GLYPHS || [];
  const Glyph = window.GlyphSvg;

  return (
    <>
      <SectionHeader kicker="01" title="Firm"
        subtitle="Your firm's name and tagline appear in the header; the footer shows the copyright and revision lines." />

      <SettingRow label="Firm name"
        description="Shown at the top-left of every page, before the tagline.">
        <input type="text" value={settings.firmName || ''}
          onChange={e => set('firmName', e.target.value)}
          style={{ ...fieldStyleBase(), minWidth: 320 }} />
      </SettingRow>

      <SettingRow label="Tagline"
        description="Shown after the firm name, separated by an em dash. Leave blank to hide.">
        <input type="text" value={settings.firmTagline || ''}
          onChange={e => set('firmTagline', e.target.value)}
          style={{ ...fieldStyleBase(), minWidth: 320 }} />
      </SettingRow>

      <SettingRow label="Footer (left)"
        description="Shown at the bottom-left of every page.">
        <input type="text" value={settings.firmFooterLeft || ''}
          onChange={e => set('firmFooterLeft', e.target.value)}
          style={{ ...fieldStyleBase(), minWidth: 320 }} />
      </SettingRow>

      <SettingRow label="Footer (right)"
        description="Shown at the bottom-right — often the revision or document status.">
        <input type="text" value={settings.firmFooterRight || ''}
          onChange={e => set('firmFooterRight', e.target.value)}
          style={{ ...fieldStyleBase(), minWidth: 320 }} />
      </SettingRow>

      <SettingRow label="Logo mark"
        description="Shown beside the firm name. Pick the default mark, a preset glyph, or upload your own.">
        <Segmented value={logoType} onChange={v => set('firmLogoType', v)}
          options={[
            { key: 'default', label: 'Default' },
            { key: 'preset',  label: 'Preset' },
            { key: 'upload',  label: 'Upload' },
          ]} />
      </SettingRow>

      {logoType === 'preset' && Glyph && (
        <SettingRow label="Preset glyph"
          description="Pick one of the 25 preset marks.">
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(8, 44px)', gap: 6,
            maxWidth: 400,
          }}>
            {glyphs.map(g => {
              const active = settings.firmLogoPreset === g.id;
              return (
                <button key={g.id} type="button" title={g.label}
                  onClick={() => set('firmLogoPreset', g.id)}
                  style={{
                    width: 44, height: 44,
                    background: active ? 'var(--tint-2)' : 'transparent',
                    border: '1px solid ' + (active ? 'var(--ink)' : 'var(--rule-2)'),
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: 0,
                  }}>
                  <Glyph id={g.id} size={22} />
                </button>
              );
            })}
          </div>
        </SettingRow>
      )}

      {logoType === 'upload' && (
        <SettingRow label="Upload image"
          description="PNG or SVG recommended. Max 200 KB — will render at 22×22 pixels in the header.">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {settings.firmLogoData && (
              <img src={settings.firmLogoData} alt=""
                style={{ width: 44, height: 44, objectFit: 'contain',
                  border: '1px solid var(--rule-2)', padding: 4 }} />
            )}
            <input ref={fileRef} type="file" accept="image/*"
              onChange={e => handleFile(e.target.files?.[0])}
              style={{ display: 'none' }} />
            <button type="button" onClick={() => fileRef.current?.click()}
              style={{
                ...fieldStyleBase(),
                width: 'auto', padding: '6px 14px', cursor: 'pointer',
              }}>
              {settings.firmLogoData ? 'Replace image' : 'Choose image'}
            </button>
            {settings.firmLogoData && (
              <button type="button" onClick={() => set('firmLogoData', null)}
                style={{
                  ...fieldStyleBase(),
                  width: 'auto', padding: '6px 14px', cursor: 'pointer',
                  color: 'var(--ink-3)',
                }}>
                Remove
              </button>
            )}
            {uploadError && (
              <span style={{ fontSize: 12, color: 'var(--accent)' }}>{uploadError}</span>
            )}
          </div>
        </SettingRow>
      )}
    </>
  );
}

function LibraryDefaultsSection({ settings, set }) {
  return (
    <>
      <SectionHeader kicker="06" title="Library defaults"
        subtitle="New material entries start with these values filled in." />

      <SettingRow label="Default category"
        description="The category pre-selected when you add a new material.">
        <select value={settings.defaultCategory}
          onChange={e => set('defaultCategory', e.target.value)}
          style={{
            ...fieldStyleBase(),
            minWidth: 220,
          }}>
          {(window.CATEGORIES || ['Timber']).map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </SettingRow>

      <SettingRow label="Default unit"
        description="The unit pre-selected for new materials.">
        <Segmented value={settings.defaultUnit} onChange={v => set('defaultUnit', v)}
          options={[
            { key: 'm²', label: 'm²' },
            { key: 'l/m', label: 'l / m' },
            { key: 'each', label: 'Each' },
            { key: 'sheet', label: 'Sheet' },
          ]} />
      </SettingRow>
    </>
  );
}

// ─────────────── Codes & duplicates ───────────────

const PRESET_DESCRIPTIONS = {
  A: 'Codes are project-scoped and auto-managed. Duplicating a material picks the next code in series. Saving a new material with a matching code or name shows a warning.',
  B: 'Same as A, but deleting a material offers to close the gap in the series.',
  C: 'Office catalog mode. Codes are office-wide identifiers. Duplicates are blocked. No auto-assignment — you type the code.',
  D: 'Free-form. Duplicates are warned but never blocked. Codes default to blank on new materials.',
};

function CodesSection({ settings, set }) {
  const policy = settings.dupePolicy || window.DUPE_PRESET_A || {};
  const preset = policy.preset || 'A';
  const isCustom = preset === 'custom';

  function setPolicy(key, value) {
    set('dupePolicy', { ...policy, [key]: value, preset: 'custom' });
  }
  function setPreset(p) {
    const bundle = (window.DUPE_PRESETS || {})[p];
    if (bundle) set('dupePolicy', { ...bundle });
  }

  const presets = [
    { key: 'A', label: 'Project-scoped, auto-managed', meta: 'Default' },
    { key: 'B', label: 'Project-scoped, gap-closing' },
    { key: 'C', label: 'Office catalog' },
    { key: 'D', label: 'Free-form with guardrails' },
    { key: 'custom', label: 'Custom…' },
  ];

  return (
    <>
      <SectionHeader kicker="07" title="Codes & duplicates"
        subtitle="Controls how material codes are assigned, how duplicates are detected, and what happens when codes collide." />

      <SettingRow label="Office style"
        description="Each preset is a bundle of code-management behaviours suited to a particular office workflow.">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {presets.map(p => {
            const active = preset === p.key;
            return (
              <button key={p.key} type="button"
                onClick={() => p.key === 'custom' ? set('dupePolicy', { ...policy, preset: 'custom' }) : setPreset(p.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px', textAlign: 'left', cursor: 'pointer',
                  border: '1px solid ' + (active ? 'var(--ink)' : 'var(--rule-2)'),
                  background: active ? 'var(--tint)' : 'transparent',
                  fontFamily: 'var(--font-sans)',
                }}>
                <div style={{
                  width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
                  border: '1.5px solid ' + (active ? 'var(--ink)' : 'var(--rule-2)'),
                  background: active ? 'var(--ink)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {active && <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--paper)' }} />}
                </div>
                <div>
                  <span style={{ fontSize: 13, fontWeight: active ? 500 : 400 }}>{p.label}</span>
                  {p.meta && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9,
                    color: 'var(--ink-4)', marginLeft: 8, letterSpacing: '0.08em',
                    textTransform: 'uppercase' }}>{p.meta}</span>}
                </div>
              </button>
            );
          })}
        </div>
        {!isCustom && (
          <div style={{ marginTop: 10, fontFamily: 'var(--font-serif)', fontStyle: 'italic',
            fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.45 }}>
            {PRESET_DESCRIPTIONS[preset]}
          </div>
        )}
      </SettingRow>

      {isCustom && (
        <div style={{
          margin: '0 0 2px', padding: '18px 24px',
          background: 'var(--tint)', border: '1px solid var(--rule)',
          display: 'flex', flexDirection: 'column', gap: 20,
        }}>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600,
            letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>
            Custom settings
          </div>

          <SubRow label="Code scope">
            <Segmented value={policy.scope || 'project'} onChange={v => setPolicy('scope', v)}
              options={[{ key: 'project', label: 'Per-project' }, { key: 'library', label: 'Office-wide' }]} />
          </SubRow>

          <SubRow label="Auto-assign code — new material">
            <Segmented value={policy.autoAssign || 'series'} onChange={v => setPolicy('autoAssign', v)}
              options={[
                { key: 'none', label: 'None' },
                { key: 'series', label: 'Next in series' },
                { key: 'project-max', label: 'Project max + 1' },
                { key: 'library-max', label: 'Library max + 1' },
              ]} />
          </SubRow>

          <SubRow label="On duplicate — name">
            <Segmented value={policy.duplicateName || 'keep'} onChange={v => setPolicy('duplicateName', v)}
              options={[
                { key: 'keep', label: 'Keep' },
                { key: 'copy-suffix', label: 'Append (copy)' },
                { key: 'number-suffix', label: 'Append number' },
                { key: 'blank', label: 'Blank' },
              ]} />
          </SubRow>

          <SubRow label="On duplicate — code">
            <Segmented value={policy.duplicateCode || 'series'} onChange={v => setPolicy('duplicateCode', v)}
              options={[
                { key: 'series', label: 'Next in series' },
                { key: 'copy-suffix', label: 'Append -copy' },
                { key: 'blank', label: 'Blank' },
              ]} />
          </SubRow>

          <SubRow label="Project uniqueness">
            <Segmented value={policy.uniquenessProject || 'block'} onChange={v => setPolicy('uniquenessProject', v)}
              options={[{ key: 'block', label: 'Block' }, { key: 'warn', label: 'Warn' }, { key: 'off', label: 'Off' }]} />
          </SubRow>

          <SubRow label="Library uniqueness">
            <Segmented value={policy.uniquenessLibrary || 'warn'} onChange={v => setPolicy('uniquenessLibrary', v)}
              options={[{ key: 'block', label: 'Block' }, { key: 'warn', label: 'Warn' }, { key: 'off', label: 'Off' }]} />
          </SubRow>

          <SubRow label="Duplicate warning">
            <Segmented value={policy.warnOnMaterialDupe || 'warn'} onChange={v => setPolicy('warnOnMaterialDupe', v)}
              options={[
                { key: 'auto-rename', label: 'Auto-rename' },
                { key: 'warn', label: 'Warn' },
                { key: 'block', label: 'Block' },
                { key: 'off', label: 'Off' },
              ]} />
          </SubRow>

          <SubRow label="On delete">
            <Segmented value={policy.onDelete || 'leave'} onChange={v => setPolicy('onDelete', v)}
              options={[
                { key: 'leave', label: 'Leave gap' },
                { key: 'ask', label: 'Ask' },
                { key: 'close-silent', label: 'Close silently' },
              ]} />
          </SubRow>

          <SubRow label="Fuzzy name matching">
            <Toggle value={!!policy.fuzzyNameMatch} onChange={v => setPolicy('fuzzyNameMatch', v)}
              onLabel="On" offLabel="Off" />
          </SubRow>

          <SubRow label="Require code on save">
            <Toggle value={!!policy.requireCodeOnSave} onChange={v => setPolicy('requireCodeOnSave', v)}
              onLabel="Required" offLabel="Optional" />
          </SubRow>
        </div>
      )}

      {!isCustom && (
        <>
          <SettingRow label="On duplicate — code"
            description="How the code is set when you duplicate a material.">
            <Segmented
              value={policy.duplicateCode || 'series'}
              onChange={v => setPolicy('duplicateCode', v)}
              options={[
                { key: 'series', label: 'Next in series' },
                { key: 'copy-suffix', label: 'Append -copy' },
                { key: 'blank', label: 'Blank' },
              ]}
            />
          </SettingRow>

          <SettingRow label="Duplicate warning"
            description="What happens when you save a new material that looks like an existing one. Auto-rename silently assigns the next code in series instead of prompting.">
            <Segmented
              value={policy.warnOnMaterialDupe || 'warn'}
              onChange={v => setPolicy('warnOnMaterialDupe', v)}
              options={[
                { key: 'auto-rename', label: 'Auto-rename' },
                { key: 'warn', label: 'Warn' },
                { key: 'block', label: 'Block' },
                { key: 'off', label: 'Off' },
              ]}
            />
          </SettingRow>

          <SettingRow label="Project uniqueness"
            description="How to treat two materials with the same code in the same project.">
            <Segmented
              value={policy.uniquenessProject || 'block'}
              onChange={v => setPolicy('uniquenessProject', v)}
              options={[
                { key: 'block', label: 'Block' },
                { key: 'warn', label: 'Warn' },
                { key: 'off', label: 'Off' },
              ]}
            />
          </SettingRow>
        </>
      )}
    </>
  );
}

// ─────────────── Project defaults ───────────────

function ProjectDefaultsSection({ settings, set }) {
  const currencies = Object.entries(window.CURRENCY_SYMBOLS || {}).map(([k, v]) =>
    ({ key: k, label: k + ' · ' + v }));
  return (
    <>
      <SectionHeader kicker="08" title="Project defaults"
        subtitle="New projects start with these values filled in." />

      <SettingRow label="Default stage">
        <Segmented value={settings.defaultStage} onChange={v => set('defaultStage', v)}
          options={['Concept', 'Documentation', 'Construction', 'Handover']
            .map(s => ({ key: s, label: s }))} />
      </SettingRow>

      <SettingRow label="Default currency"
        description="Used when budgets and costs are formatted.">
        <Segmented value={settings.defaultCurrency} onChange={v => set('defaultCurrency', v)}
          options={currencies} />
      </SettingRow>
    </>
  );
}

// ─────────────── Data ───────────────

// ─────────────── Cloud Section (Phase 5) ───────────────
// Account chrome, manual migrate / seed / clear actions, sign-out.
// Migration is idempotent — only fills cloud rows that don't yet exist;
// never overwrites cloud data with stale localStorage data.
function CloudSection({ materials, projects, libraries, labelTemplates }) {
  const { useState, useEffect } = React;
  const [email, setEmail] = useState('');
  const [saveState, setSaveState] = useState({ pending: 0, lastError: null, lastSavedAt: null });
  const [busy, setBusy] = useState(null);          // 'migrate' | 'seed' | 'clear' | 'signout' | null
  const [progress, setProgress] = useState(null);  // { kind, line, total, current }
  const [done, setDone] = useState(null);          // { kind, summary } | null
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (!window.cloud) return;
    window.cloud.getSession().then(s => {
      if (s && s.user) setEmail(s.user.email || '');
    });
    return window.cloud.onSaveStatus(setSaveState);
  }, []);

  function reset() { setProgress(null); setDone(null); setErr(null); }

  async function onMigrate() {
    if (!window.cloud) return;
    if (!window.confirm(
      'Migrate everything in this browser to the shared workspace? Cloud data ' +
      'is not overwritten — only items missing from cloud get inserted. ' +
      'Your browser data is not deleted.')) return;
    reset(); setBusy('migrate');
    try {
      const result = await migrateBrowserToCloud();
      setDone({ kind: 'migrate', summary: result });
    } catch (e) {
      setErr(e.message || String(e));
    } finally { setBusy(null); setProgress(null); }
  }

  async function onSeed() {
    if (!window.cloud) return;
    if (!window.confirm(
      'Seed the workspace with the starter library? This adds the example ' +
      'projects, materials, and libraries. Running on a workspace that already ' +
      'has these starter items will create duplicates if you have edited them.')) return;
    reset(); setBusy('seed');
    try {
      const result = await seedWorkspace();
      setDone({ kind: 'seed', summary: result });
    } catch (e) {
      setErr(e.message || String(e));
    } finally { setBusy(null); setProgress(null); }
  }

  function onClear() {
    if (!window.confirm(
      'Remove all aml-* keys from this browser\'s localStorage? Use this ONLY ' +
      'after you\'ve confirmed your data is safely in the cloud (sign in on ' +
      'another device and check). This cannot be undone.')) return;
    reset(); setBusy('clear');
    try {
      const removed = clearLegacyLocalStorage();
      setDone({ kind: 'clear', summary: { removed } });
    } catch (e) {
      setErr(e.message || String(e));
    } finally { setBusy(null); }
  }

  async function onSignOut() {
    if (!window.cloud) return;
    if (!window.confirm('Sign out of this device?')) return;
    setBusy('signout');
    try { await window.cloud.flushPending(); } catch {}
    try { await window.cloud.signOut(); } catch (e) { setErr(e.message || String(e)); }
    setBusy(null);
  }

  // Migration / seed implementations live below as plain async functions so
  // we can call them with progress callbacks scoped to this component.
  async function migrateBrowserToCloud() {
    const summary = { settings: 0, ui: 0, seedVersion: 0, labelTemplates: 0,
      materials: 0, projects: 0, libraries: 0, schedules: 0, specs: 0 };

    setProgress({ line: 'Reading workspace from cloud…' });
    const appStateCloud = (await window.cloud.loadAppState()) || {};
    const materialsCloud = await window.cloud.loadCollection('materials');
    const projectsCloud  = await window.cloud.loadCollection('projects');
    const librariesCloud = await window.cloud.loadCollection('libraries');

    const appPatch = { ...appStateCloud };
    let appChanged = false;

    setProgress({ line: 'Reading legacy keys from localStorage…' });
    const lsSettings = readLSJson('aml-settings');
    if (lsSettings && !appStateCloud.settings) {
      appPatch.settings = lsSettings; appChanged = true; summary.settings = 1;
    }
    const ui = collectLegacyUiKeys();
    if (Object.keys(ui).length > 0 && !appStateCloud.ui) {
      appPatch.ui = ui; appChanged = true; summary.ui = Object.keys(ui).length;
    }
    const seedVer = readLSRaw('aml-seed-version');
    if (seedVer != null && appStateCloud.seed_version == null) {
      const n = parseInt(seedVer, 10);
      if (!isNaN(n)) { appPatch.seed_version = n; appChanged = true; summary.seedVersion = 1; }
    }
    const lsTpl = readLSJson('aml-label-templates');
    if (lsTpl && typeof lsTpl === 'object' && !Array.isArray(lsTpl)
        && !appStateCloud.label_templates) {
      appPatch.label_templates = lsTpl; appChanged = true; summary.labelTemplates = 1;
    }
    if (appChanged) {
      setProgress({ line: 'Saving workspace settings…' });
      await window.cloud.saveAppStateNow(appPatch);
    }

    const cloudHasId = (list, id) => list.some(x => x.id === id);

    const lsMaterials = readLSJson('aml-materials');
    if (Array.isArray(lsMaterials)) {
      const todo = lsMaterials.filter(m => !cloudHasId(materialsCloud, m.id));
      for (let i = 0; i < todo.length; i++) {
        setProgress({ line: 'Uploading materials…', current: i + 1, total: todo.length });
        await window.cloud.upsertItemNow('materials', todo[i].id, todo[i]);
      }
      summary.materials = todo.length;
    }
    const lsProjects = readLSJson('aml-projects');
    if (Array.isArray(lsProjects)) {
      const todo = lsProjects.filter(p => !cloudHasId(projectsCloud, p.id));
      for (let i = 0; i < todo.length; i++) {
        setProgress({ line: 'Uploading projects…', current: i + 1, total: todo.length });
        await window.cloud.upsertItemNow('projects', todo[i].id, todo[i]);
      }
      summary.projects = todo.length;
    }
    const lsLibraries = readLSJson('aml-libraries');
    if (Array.isArray(lsLibraries)) {
      const todo = lsLibraries.filter(l => !cloudHasId(librariesCloud, l.id));
      for (let i = 0; i < todo.length; i++) {
        setProgress({ line: 'Uploading libraries…', current: i + 1, total: todo.length });
        await window.cloud.upsertItemNow('libraries', todo[i].id, todo[i]);
      }
      summary.libraries = todo.length;
    }

    // Per-project schedules + specs. Use the resulting projects list to scope.
    const finalProjects = lsProjects || projectsCloud.map(r => r); // best-effort
    for (let i = 0; i < finalProjects.length; i++) {
      const p = finalProjects[i];
      setProgress({ line: 'Uploading schedules + specs…', current: i + 1, total: finalProjects.length });
      const lsSched = readLSJson('aml-schedule-' + p.id);
      if (lsSched) {
        const existing = await window.cloud.loadSchedule(p.id);
        if (!existing) {
          await window.cloud.saveScheduleNow(p.id, lsSched);
          summary.schedules++;
        }
      }
      const lsSpec = readLSJson('aml-spec-' + p.id);
      if (lsSpec) {
        const existing = await window.cloud.loadSpec(p.id);
        if (!existing) {
          await window.cloud.saveSpecNow(p.id, lsSpec);
          summary.specs++;
        }
      }
    }

    return summary;
  }

  async function seedWorkspace() {
    const summary = { materials: 0, projects: 0, libraries: 0, schedules: 0, specs: 0 };
    const seeds = {
      materials: window.MATERIALS || [],
      projects:  window.PROJECTS  || [],
      libraries: window.LIBRARIES || [],
      schedules: window.SEED_SCHEDULES || {},
      specs:     window.SEED_SPECS     || {},
    };
    const tpl = window.DEFAULT_TEMPLATES;
    if (tpl) {
      setProgress({ line: 'Seeding label templates…' });
      const cur = (await window.cloud.loadAppState()) || {};
      await window.cloud.saveAppStateNow({ ...cur, label_templates: tpl });
    }
    for (let i = 0; i < seeds.materials.length; i++) {
      setProgress({ line: 'Seeding materials…', current: i + 1, total: seeds.materials.length });
      const m = seeds.materials[i];
      await window.cloud.upsertItemNow('materials', m.id, m);
      summary.materials++;
    }
    for (let i = 0; i < seeds.projects.length; i++) {
      setProgress({ line: 'Seeding projects…', current: i + 1, total: seeds.projects.length });
      const p = seeds.projects[i];
      await window.cloud.upsertItemNow('projects', p.id, p);
      summary.projects++;
    }
    for (let i = 0; i < seeds.libraries.length; i++) {
      setProgress({ line: 'Seeding libraries…', current: i + 1, total: seeds.libraries.length });
      const l = seeds.libraries[i];
      await window.cloud.upsertItemNow('libraries', l.id, l);
      summary.libraries++;
    }
    const schedIds = Object.keys(seeds.schedules);
    for (let i = 0; i < schedIds.length; i++) {
      setProgress({ line: 'Seeding schedules…', current: i + 1, total: schedIds.length });
      await window.cloud.saveScheduleNow(schedIds[i], seeds.schedules[schedIds[i]]);
      summary.schedules++;
    }
    const specIds = Object.keys(seeds.specs);
    for (let i = 0; i < specIds.length; i++) {
      setProgress({ line: 'Seeding specs…', current: i + 1, total: specIds.length });
      await window.cloud.saveSpecNow(specIds[i], seeds.specs[specIds[i]]);
      summary.specs++;
    }
    return summary;
  }

  function clearLegacyLocalStorage() {
    let count = 0;
    try {
      const keys = Object.keys(localStorage);
      for (const k of keys) {
        if (k.startsWith('aml-')) { localStorage.removeItem(k); count++; }
      }
    } catch {}
    return count;
  }

  function collectLegacyUiKeys() {
    const ui = {};
    const map = [
      ['aml-view', 'view'],
      ['aml-library-mode', 'libraryMode'],
      ['aml-active-library', 'activeLibraryId'],
      ['aml-active-project', 'activeProjectId'],
      ['aml-schedule-version', 'scheduleVersion'],
    ];
    map.forEach(([lsKey, uiKey]) => {
      const v = readLSRaw(lsKey);
      if (v) ui[uiKey] = v;
    });
    return ui;
  }
  function readLSJson(key) {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; }
    catch { return null; }
  }
  function readLSRaw(key) {
    try { return localStorage.getItem(key) || null; } catch { return null; }
  }

  // ───── Render ─────
  const lastSavedLabel = saveState.lastSavedAt
    ? formatRelativeTime(saveState.lastSavedAt)
    : '—';

  return (
    <section style={{ maxWidth: 720 }}>
      <SectionHeader kicker="09" title="Cloud" subtitle={
        'Workspace sync. All persistent data lives in the shared Supabase ' +
        'workspace; this page surfaces account info and one-time migration ' +
        'tools for moving legacy browser data into the cloud.'} />

      <SubsectionHeader>Account</SubsectionHeader>
      <SettingRow label="Signed in as" description="The email associated with this device's session.">
        <span style={{ ...ui.mono, fontSize: 12, color: 'var(--ink-2)' }}>{email || '—'}</span>
      </SettingRow>
      <SettingRow label="Last save" description="When this device most recently completed a cloud write.">
        <span style={{ ...ui.mono, fontSize: 12, color: saveState.lastError ? '#c54a3b' : 'var(--ink-2)' }}>
          {saveState.lastError ? 'Failed: ' + saveState.lastError : lastSavedLabel}
        </span>
      </SettingRow>
      <SettingRow label="Sign out" description="Ends this device's session. Cloud data is unaffected.">
        <DataButton onClick={onSignOut} disabled={busy === 'signout'}>
          {busy === 'signout' ? 'Signing out…' : 'Sign out'}
        </DataButton>
      </SettingRow>

      <SubsectionHeader>Migration</SubsectionHeader>
      <SettingRow
        label="Migrate browser data → cloud"
        description={
          'Uploads everything in this browser\'s localStorage to the shared ' +
          'workspace. Safe to re-run — only inserts items missing from cloud, ' +
          'never overwrites. Your browser data is NOT deleted by this action.'}>
        <DataButton onClick={onMigrate} disabled={!!busy}>
          {busy === 'migrate' ? 'Migrating…' : 'Start migration'}
        </DataButton>
      </SettingRow>

      <SubsectionHeader>Workspace</SubsectionHeader>
      <SettingRow
        label="Seed workspace"
        description={
          'Populates this workspace with the example projects, materials, ' +
          'and libraries. Only use on a fresh workspace — running on an ' +
          'existing workspace will add duplicates if you have edited the ' +
          'starter items.'}>
        <DataButton onClick={onSeed} disabled={!!busy}>
          {busy === 'seed' ? 'Seeding…' : 'Seed workspace'}
        </DataButton>
      </SettingRow>
      <SettingRow
        label="Clear browser leftovers"
        description={
          'Removes all aml-* keys from this browser\'s localStorage. Use ' +
          'after confirming your data is safely in the cloud (sign in on ' +
          'another device and check). This cannot be undone.'}>
        <DataButton onClick={onClear} danger disabled={!!busy}>
          {busy === 'clear' ? 'Clearing…' : 'Clear localStorage'}
        </DataButton>
      </SettingRow>

      {(progress || done || err) && (
        <div style={{
          marginTop: 28, padding: '14px 18px',
          background: err ? 'rgba(197, 74, 59, 0.08)' : 'var(--tint)',
          border: '1px solid ' + (err ? 'rgba(197, 74, 59, 0.3)' : 'var(--rule)'),
          borderRadius: 2, fontSize: 13, lineHeight: 1.5,
        }}>
          {progress && (
            <div style={{ ...ui.mono, fontSize: 11, color: 'var(--ink-3)',
              letterSpacing: '0.08em' }}>
              {progress.line}{progress.total
                ? ` (${progress.current} / ${progress.total})` : ''}
            </div>
          )}
          {done && (
            <div>
              <div style={{ ...ui.mono, fontSize: 11, letterSpacing: '0.14em',
                textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 6 }}>
                {done.kind === 'migrate' && 'Migration complete'}
                {done.kind === 'seed' && 'Seed complete'}
                {done.kind === 'clear' && 'Cleared'}
              </div>
              <div style={{ color: 'var(--ink-2)' }}>
                {done.kind === 'clear'
                  ? `Removed ${done.summary.removed} key${done.summary.removed === 1 ? '' : 's'} from localStorage.`
                  : Object.entries(done.summary)
                      .filter(([_, v]) => v > 0)
                      .map(([k, v]) => `${v} ${k}`).join(' · ') || 'Nothing to do — cloud already populated.'}
              </div>
              <div style={{ marginTop: 10 }}>
                <DataButton onClick={() => location.reload()}>
                  Refresh app
                </DataButton>
              </div>
            </div>
          )}
          {err && (
            <div>
              <div style={{ ...ui.mono, fontSize: 11, letterSpacing: '0.14em',
                textTransform: 'uppercase', color: '#c54a3b', marginBottom: 6 }}>
                Failed
              </div>
              <div style={{ color: '#7a2412' }}>{err}</div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function formatRelativeTime(ts) {
  const ms = Date.now() - ts;
  const s = Math.round(ms / 1000);
  if (s < 5)    return 'just now';
  if (s < 60)   return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60)   return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24)   return `${h}h ago`;
  return new Date(ts).toLocaleString();
}

function DataSection({ settings, materials, projects, libraries, labelTemplates,
  setSettings, onRestoreSeed, onImport }) {
  const fileRef = React.useRef();
  const [importMsg, setImportMsg] = React.useState(null);

  async function exportAll() {
    // Phase 4: per-project cost schedules and specs live in the cloud.
    // Load each project's row in parallel, then build the archive payload.
    const schedules = {};
    const specs = {};
    if (window.cloud && Array.isArray(projects)) {
      const tasks = [];
      for (const p of projects) {
        tasks.push(
          window.cloud.loadSchedule(p.id).then(s => { if (s) schedules[p.id] = s; })
            .catch(err => console.error('[exportAll] schedule load failed:', p.id, err))
        );
        tasks.push(
          window.cloud.loadSpec(p.id).then(s => { if (s) specs[p.id] = s; })
            .catch(err => console.error('[exportAll] spec load failed:', p.id, err))
        );
      }
      await Promise.all(tasks);
    }

    const payload = {
      _type: 'hollis-arne-archive',
      _version: 2,
      _exportedAt: new Date().toISOString(),
      settings, materials, projects, libraries, labelTemplates,
      schedules, specs,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)],
      { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = 'hollis-arne-archive-' + stamp + '.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function handleImportFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (data._type !== 'hollis-arne-archive') {
          setImportMsg({ kind: 'err', msg: 'That file does not look like an archive export.' });
          return;
        }
        if (!window.confirm(
          'Import will replace your current materials, projects, libraries, ' +
          'label templates and settings. Continue?')) return;
        onImport(data);
        setImportMsg({ kind: 'ok', msg: 'Imported. Your archive has been replaced.' });
      } catch (err) {
        setImportMsg({ kind: 'err', msg: 'Could not parse file: ' + err.message });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function resetSettingsOnly() {
    if (!window.confirm('Reset ALL settings to factory defaults? ' +
      'Your materials, projects, and libraries are not affected.')) return;
    setSettings(window.resetSettings());
  }

  return (
    <>
      <SectionHeader kicker="09" title="Data"
        subtitle="Back up, restore, or reset the archive. Everything lives in your browser — export regularly." />

      <SettingRow label="Export archive"
        description="Download a complete JSON snapshot — materials, projects, libraries, label templates, and settings.">
        <DataButton onClick={exportAll}>Download JSON</DataButton>
        <div style={{ marginTop: 8, ...ui.mono, fontSize: 10,
          color: 'var(--ink-4)', letterSpacing: '0.06em' }}>
          {materials.length} materials · {projects.length} projects · {libraries.length} libraries
        </div>
      </SettingRow>

      <SettingRow label="Import archive"
        description="Restore a previously exported JSON file. This replaces all current data.">
        <input ref={fileRef} type="file" accept="application/json,.json"
          onChange={handleImportFile} style={{ display: 'none' }} />
        <DataButton onClick={() => fileRef.current.click()}>Choose file…</DataButton>
        {importMsg && (
          <div style={{
            marginTop: 10, padding: '8px 12px',
            borderLeft: '2px solid ' + (importMsg.kind === 'ok' ? 'var(--accent)' : 'var(--ink)'),
            background: 'var(--tint)',
            fontFamily: "'Newsreader', var(--font-serif, serif)",
            fontStyle: 'italic', fontSize: 13, color: 'var(--ink-2)',
          }}>{importMsg.msg}</div>
        )}
      </SettingRow>

      <SubsectionHeader>Reset</SubsectionHeader>

      <SettingRow label="Reset settings only"
        description="Restore appearance, typography, density and defaults to factory. Your materials and projects are preserved.">
        <DataButton onClick={resetSettingsOnly}>Reset settings</DataButton>
      </SettingRow>

      <SettingRow label="Restore seed library"
        description="Wipe all materials, projects and libraries and reinstall the original seed archive. Cannot be undone.">
        <DataButton danger onClick={onRestoreSeed}>Restore seed…</DataButton>
      </SettingRow>
    </>
  );
}

function DataButton({ children, onClick, danger, disabled }) {
  const [hover, setHover] = React.useState(false);
  const showHover = hover && !disabled;
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: '9px 18px',
        background: showHover ? 'var(--ink)' : 'transparent',
        color: showHover ? 'var(--paper)' : 'var(--ink)',
        border: '1px solid ' + (disabled ? 'var(--rule-2)' : 'var(--ink)'),
        opacity: disabled ? 0.5 : 1,
        fontFamily: "'Inter Tight', var(--font-sans, system-ui), sans-serif",
        fontSize: 11.5, fontWeight: 500,
        letterSpacing: '0.06em', textTransform: 'uppercase',
        cursor: disabled ? 'wait' : 'pointer',
      }}>
      {children}
    </button>
  );
}

// ─────────────── Keyboard ───────────────

function KeyboardSection() {
  const groups = [
    {
      title: 'Global',
      rows: [
        ['/', 'Focus search'],
        ['⌘ K', 'Open command palette'],
        ['?', 'Show / hide this cheatsheet'],
        ['Esc', 'Close any modal, panel, or overlay'],
      ],
    },
    {
      title: 'Library — Table mode',
      rows: [
        ['J / ↓', 'Next row'],
        ['K / ↑', 'Previous row'],
        ['O / ↵', 'Open selected row'],
        ['E',     'Edit selected row'],
        ['X',     'Toggle checkbox'],
        ['Shift X', 'Range-select from last checked'],
        ['C',     'Add to compare tray'],
      ],
    },
    {
      title: 'Library — Gallery mode',
      rows: [
        ['Click', 'Open entry'],
        ['⌘ Click', 'Add to compare tray'],
      ],
    },
    {
      title: 'Settings & navigation',
      rows: [
        ['G L', 'Go to Library (global)'],
        ['G P', 'Go to Projects'],
        ['G C', 'Go to Cost Schedule'],
        ['G S', 'Go to Settings'],
      ],
    },
  ];
  return (
    <>
      <SectionHeader kicker="10" title="Keyboard"
        subtitle="Shortcuts throughout the archive. Press ? from anywhere to open a quick overlay." />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: 48, rowGap: 36, paddingTop: 8 }}>
        {groups.map(g => (
          <div key={g.title}>
            <div style={{ ...ui.mono, fontSize: 10, color: 'var(--ink-4)',
              letterSpacing: '0.14em', textTransform: 'uppercase',
              paddingBottom: 10, borderBottom: '1px solid var(--rule)' }}>
              {g.title}
            </div>
            {g.rows.map(([k, label], i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                padding: '9px 0',
                borderBottom: i < g.rows.length - 1 ? '1px dotted var(--rule-2)' : 'none',
              }}>
                <span style={{ ...ui.serif, fontSize: 14, color: 'var(--ink-2)' }}>{label}</span>
                <span style={{
                  fontFamily: "'JetBrains Mono', var(--font-mono, monospace)",
                  fontSize: 11,
                  padding: '2px 8px',
                  border: '1px solid var(--rule-2)',
                  background: 'var(--tint)',
                  letterSpacing: '0.04em',
                  color: 'var(--ink)',
                }}>{k}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}

// ─────────────── About ───────────────

function AboutSection() {
  const changes = [
    { v: '0.9.4', d: '22 Apr 2026',
      items: ['Settings page replaces the Tweaks panel for user-facing preferences',
        'Six themes: Light, Daylight, Sepia, Ink, Dark, High contrast',
        'Five typeface presets: Editorial, Archival, Monument, System, Bold',
        'Rule style, swatch shape, row stripes controls',
        'Data export / import / reset'] },
    { v: '0.9.3', d: '18 Apr 2026',
      items: ['Gallery width control', 'Table mode keyboard shortcuts',
        'Command palette (⌘K)'] },
    { v: '0.9.2', d: '10 Apr 2026',
      items: ['Custom label templates per category', 'Paint linkage for paintable materials'] },
    { v: '0.9.1', d: '02 Apr 2026',
      items: ['Libraries (Studio Master, project-specific, paints)',
        'Cost schedule per project'] },
    { v: '0.9.0', d: '24 Mar 2026',
      items: ['Initial studio archive — Library, Projects, Cost Schedule'] },
  ];
  return (
    <>
      <SectionHeader kicker="11" title="About"
        subtitle="Hollis & Arne — Studio Archive. Built in-house." />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, paddingTop: 8 }}>
        <div>
          <Eyebrow>Version</Eyebrow>
          <div style={{ marginTop: 6, display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <Serif size={28} style={{ lineHeight: 1 }}>0.9.4</Serif>
            <Mono size={11} color="var(--ink-4)">REV 22·04·26 · INTERNAL</Mono>
          </div>
          <div style={{ marginTop: 20 }}>
            <Eyebrow>Storage</Eyebrow>
            <div style={{ marginTop: 8, ...ui.serif, fontSize: 14,
              color: 'var(--ink-2)', lineHeight: 1.5, maxWidth: 380 }}>
              All data is stored locally in this browser. Nothing is sent
              to a server. Export regularly from the Data section.
            </div>
          </div>
        </div>

        <div>
          <Eyebrow>Changelog</Eyebrow>
          <div style={{ marginTop: 10, maxHeight: 420, overflowY: 'auto',
            paddingRight: 10 }}>
            {changes.map(c => (
              <div key={c.v} style={{ marginBottom: 22, paddingBottom: 18,
                borderBottom: '1px dotted var(--rule-2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between',
                  alignItems: 'baseline', marginBottom: 8 }}>
                  <Mono size={11} color="var(--ink)">v{c.v}</Mono>
                  <Mono size={10} color="var(--ink-4)">{c.d}</Mono>
                </div>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {c.items.map((it, i) => (
                    <li key={i} style={{ ...ui.serif, fontSize: 13.5,
                      color: 'var(--ink-2)', lineHeight: 1.5, marginBottom: 3 }}>
                      {it}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

// ─────────────── Misc shared ───────────────

function Toggle({ value, onChange, onLabel = 'On', offLabel = 'Off' }) {
  return (
    <Segmented value={value ? 'on' : 'off'}
      onChange={v => onChange(v === 'on')}
      options={[
        { key: 'off', label: offLabel },
        { key: 'on', label: onLabel },
      ]} />
  );
}

function fieldStyleBase() {
  return {
    width: '100%',
    background: 'transparent',
    border: '1px solid var(--rule-2)',
    padding: '6px 10px',
    fontFamily: "'Inter Tight', var(--font-sans, system-ui), sans-serif",
    fontSize: 13,
    color: 'var(--ink)',
    outline: 'none',
  };
}

Object.assign(window, { SettingsPage });
