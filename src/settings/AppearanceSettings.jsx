// AppearanceSettings — Appearance, Typography, Density, Layout, Firm sections.

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
                  cursor: 'pointer',
                  textAlign: 'left',
                  position: 'relative',
                  overflow: 'hidden',
                }}>
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

      <SettingRow label="Light mode button"
        description="Choose which light theme the header sun button switches to.">
        <Segmented
          value={SETTINGS_THEMES.some(t => t.key === settings.lightModeTheme && !t.dark)
            ? settings.lightModeTheme
            : 'light'}
          onChange={v => set('lightModeTheme', v)}
          options={SETTINGS_THEMES
            .filter(t => !t.dark)
            .map(t => ({ key: t.key, label: t.label }))}
        />
      </SettingRow>

      <SettingRow label="Dark mode button"
        description="Choose which dark theme the header moon button switches to.">
        <Segmented
          value={SETTINGS_THEMES.some(t => t.key === settings.darkModeTheme && t.dark)
            ? settings.darkModeTheme
            : 'dark'}
          onChange={v => set('darkModeTheme', v)}
          options={SETTINGS_THEMES
            .filter(t => t.dark)
            .map(t => ({ key: t.key, label: t.label }))}
        />
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

// ─────────────── Firm ───────────────

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
          className="st-field" style={{ minWidth: 320 }} />
      </SettingRow>

      <SettingRow label="Tagline"
        description="Shown after the firm name, separated by an em dash. Leave blank to hide.">
        <input type="text" value={settings.firmTagline || ''}
          onChange={e => set('firmTagline', e.target.value)}
          className="st-field" style={{ minWidth: 320 }} />
      </SettingRow>

      <SettingRow label="Footer (left)"
        description="Shown at the bottom-left of every page.">
        <input type="text" value={settings.firmFooterLeft || ''}
          onChange={e => set('firmFooterLeft', e.target.value)}
          className="st-field" style={{ minWidth: 320 }} />
      </SettingRow>

      <SettingRow label="Footer (right)"
        description="Shown at the bottom-right — often the revision or document status.">
        <input type="text" value={settings.firmFooterRight || ''}
          onChange={e => set('firmFooterRight', e.target.value)}
          className="st-field" style={{ minWidth: 320 }} />
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
          <div className="st-logo-grid">
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
          <div className="st-logo-row">
            {settings.firmLogoData && (
              <img src={settings.firmLogoData} alt="" className="st-logo-img" />
            )}
            <input ref={fileRef} type="file" accept="image/*"
              onChange={e => handleFile(e.target.files?.[0])}
              style={{ display: 'none' }} />
            <button type="button" onClick={() => fileRef.current?.click()} className="st-field-btn">
              {settings.firmLogoData ? 'Replace image' : 'Choose image'}
            </button>
            {settings.firmLogoData && (
              <button type="button" onClick={() => set('firmLogoData', null)} className="st-field-btn st-field-btn-muted">
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

Object.assign(window, {
  AppearanceSection, TypographySection,
  DensitySection, LayoutSection, FirmSection,
});
