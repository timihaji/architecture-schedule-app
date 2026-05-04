// SettingsPage — shell + nav + section dispatch.
// Shared section primitives (SectionHeader, SettingRow, etc.) exported here.
// Section implementations live in AppearanceSettings, LibrarySettings,
// ProjectSettings, CloudSettings, MetaSettings — all loaded after this file.

function SectionHeader({ kicker, title, subtitle }) {
  return (
    <div className="st-sec-head">
      {kicker && <div className="st-sec-head-kicker">{kicker}</div>}
      <span className="st-sec-head-title">{title}</span>
      {subtitle && <div className="st-sec-head-sub">{subtitle}</div>}
    </div>
  );
}

function SubRow({ label, children }) {
  return (
    <div className="st-sub-row">
      <div className="st-sub-row-label">{label}</div>
      <div>{children}</div>
    </div>
  );
}

function SettingRow({ label, description, children }) {
  return (
    <div className="st-setting-row">
      <div>
        <div className="st-row-label">{label}</div>
        {description && <div className="st-row-desc">{description}</div>}
      </div>
      <div style={{ minWidth: 0 }}>{children}</div>
    </div>
  );
}

function SubsectionHeader({ children }) {
  return <div className="st-subsec-head">{children}</div>;
}

function Segmented({ options, value, onChange }) {
  return (
    <div className="st-seg">
      {options.map((o) => (
        <button key={o.key} type="button"
          className={'st-seg-btn' + (value === o.key ? ' on' : '')}
          onClick={() => onChange(o.key)}>
          {o.label}
          {o.meta && <span className="st-seg-meta">{o.meta}</span>}
        </button>
      ))}
    </div>
  );
}

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

function SettingsPage({
  settings, setSettings,
  materials, projects, libraries, labelTemplates, setLabelTemplates,
  onRestoreSeed, onImport, onClose,
  onOpenLabelBuilder, onFindDupes,
}) {
  // Section components are loaded by the files that follow this one in index.html.
  // Resolved at render time — all scripts are loaded before React first renders.
  const FirmSection         = window.FirmSection;
  const AppearanceSection   = window.AppearanceSection;
  const TypographySection   = window.TypographySection;
  const DensitySection      = window.DensitySection;
  const LayoutSection       = window.LayoutSection;
  const LibraryDefaultsSection = window.LibraryDefaultsSection;
  const CodesSection        = window.CodesSection;
  const ProjectDefaultsSection = window.ProjectDefaultsSection;
  const CloudSection        = window.CloudSection;
  const DataSection         = window.DataSection;
  const KeyboardSection     = window.KeyboardSection;
  const AboutSection        = window.AboutSection;

  const cs = window.useCloudState();
  const section = cs.ui.settingsSection || 'appearance';
  const setSection = React.useCallback(
    (v) => cs.setUi({ settingsSection: v }),
    [cs.setUi],
  );

  function set(key, value) {
    setSettings(s => ({ ...s, [key]: value }));
  }

  const sections = [
    { key: 'firm',         label: 'Firm',               num: '01', group: 'Style' },
    { key: 'appearance',   label: 'Appearance',          num: '02', group: 'Style' },
    { key: 'typography',   label: 'Typography',          num: '03', group: 'Style' },
    { key: 'density',      label: 'Density',             num: '04', group: 'Style' },
    { key: 'layout',       label: 'Layout',              num: '05', group: 'Style' },
    { key: 'library',      label: 'Library defaults',    num: '06', group: 'Defaults' },
    { key: 'libraryFields',label: 'Library fields',      num: '07', group: 'Defaults' },
    { key: 'codes',        label: 'Codes & duplicates',  num: '08', group: 'Defaults' },
    { key: 'projects',     label: 'Project defaults',    num: '09', group: 'Defaults' },
    { key: 'cloud',        label: 'Cloud',               num: '10', group: 'System' },
    { key: 'data',         label: 'Data',                num: '11', group: 'System' },
    { key: 'keyboard',     label: 'Keyboard',            num: '12', group: 'System' },
    { key: 'about',        label: 'About',               num: '13', group: 'System' },
  ];
  const groups = [...new Set(sections.map(s => s.group))];

  const sectionProps = { settings, set, setSettings,
    materials, projects, libraries, labelTemplates, setLabelTemplates,
    onRestoreSeed, onImport, onOpenLabelBuilder, onFindDupes };

  return (
    <div data-screen-label="Settings" className="st-layout">
      {/* ───────── Left rail ───────── */}
      <aside className="st-rail">
        <div className="st-rail-head">
          <div className="st-rail-eyebrow">Section</div>
          <Serif size={28} style={{ marginTop: 6, display: 'block', lineHeight: 1.05 }}>
            Settings
          </Serif>
          <div className="st-rail-sub">
            Customise the studio archive. Changes apply immediately.
          </div>
        </div>

        {groups.map(g => (
          <div key={g} className="st-nav-group">
            <div className="st-nav-group-label">{g}</div>
            <nav className="st-nav">
              {sections.filter(s => s.group === g).map(s => (
                <button key={s.key} type="button"
                  className={'st-nav-btn' + (section === s.key ? ' active' : '')}
                  onClick={() => setSection(s.key)}>
                  <span className="st-nav-num">{s.num}</span>
                  {s.label}
                </button>
              ))}
            </nav>
          </div>
        ))}
      </aside>

      {/* ───────── Right pane ───────── */}
      <div className="st-main">
        {section === 'firm'         && FirmSection         && <FirmSection {...sectionProps} />}
        {section === 'appearance'   && AppearanceSection   && <AppearanceSection {...sectionProps} />}
        {section === 'typography'   && TypographySection   && <TypographySection {...sectionProps} />}
        {section === 'density'      && DensitySection      && <DensitySection {...sectionProps} />}
        {section === 'layout'       && LayoutSection       && <LayoutSection {...sectionProps} />}
        {section === 'library'      && LibraryDefaultsSection && <LibraryDefaultsSection {...sectionProps} />}
        {section === 'libraryFields' && (window.FieldManager
          ? <window.FieldManager />
          : <div style={{ padding: 40, color: 'var(--ink-4)' }}>Field Manager not loaded.</div>)}
        {section === 'codes'        && CodesSection        && <CodesSection {...sectionProps} />}
        {section === 'projects'     && ProjectDefaultsSection && <ProjectDefaultsSection {...sectionProps} />}
        {section === 'cloud'        && CloudSection        && <CloudSection {...sectionProps} />}
        {section === 'data'         && DataSection         && <DataSection {...sectionProps} />}
        {section === 'keyboard'     && KeyboardSection     && <KeyboardSection />}
        {section === 'about'        && AboutSection        && <AboutSection />}
      </div>
    </div>
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

Object.assign(window, {
  SettingsPage,
  SectionHeader, SubRow, SettingRow, SubsectionHeader, Segmented, Toggle,
});
