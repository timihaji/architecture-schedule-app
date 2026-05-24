// MetaSettings — Keyboard shortcuts and About sections.

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
      <SectionHeader kicker="11" title="Keyboard"
        subtitle="Shortcuts throughout the archive. Press ? from anywhere to open a quick overlay." />

      <div className="kbd-grid">
        {groups.map(g => (
          <div key={g.title}>
            <div className="kbd-group-label">{g.title}</div>
            {g.rows.map(([k, label], i) => (
              <div key={i} className="kbd-row"
                style={{ borderBottom: i < g.rows.length - 1 ? '1px dotted var(--rule-2)' : 'none' }}>
                <span className="kbd-action">{label}</span>
                <span className="kbd-key">{k}</span>
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
      <SectionHeader kicker="12" title="About"
        subtitle="Hollis & Arne — Studio Archive. Built in-house." />

      <div className="about-grid">
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
          <div className="about-changelog">
            {changes.map(c => (
              <div key={c.v} className="about-release">
                <div className="about-release-head">
                  <Mono size={11} color="var(--ink)">v{c.v}</Mono>
                  <Mono size={10} color="var(--ink-4)">{c.d}</Mono>
                </div>
                <ul className="about-release-list">
                  {c.items.map((it, i) => (
                    <li key={i} className="about-release-item">
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

Object.assign(window, { KeyboardSection, AboutSection });
