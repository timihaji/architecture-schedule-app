// LibrarySettings — Library defaults and Codes & duplicates sections.

function LibraryDefaultsSection({ settings, set, labelTemplates, setLabelTemplates, onOpenLabelBuilder }) {
  const tplCount = labelTemplates ? Object.keys(labelTemplates).length : 0;
  const presets = window.PRESETS || [];
  const globalText = labelTemplates && window.templateToText
    ? window.templateToText(labelTemplates.global || [])
    : '';
  const matchedPreset = presets.find(p => window.templateToText(p.parts) === globalText);
  const previewSample = window.formatLabel
    ? (() => {
        const sample = { code: 'TM-008', name: 'White oak board', category: 'Timber',
          finish: 'Matte', species: 'Oak', supplier: 'Acme' };
        try { return window.formatLabel(sample, labelTemplates || { global: [] }); }
        catch { return sample.name; }
      })()
    : '';
  function pickPreset(p) {
    if (!setLabelTemplates) return;
    setLabelTemplates(prev => ({ ...prev, global: p.parts.slice() }));
  }
  return (
    <>
      <SectionHeader kicker="06" title="Library defaults"
        subtitle="New material entries start with these values filled in." />

      <SettingRow label="Default category"
        description="The category pre-selected when you add a new material.">
        <select value={settings.defaultCategory}
          onChange={e => set('defaultCategory', e.target.value)}
          className="st-field" style={{ minWidth: 220 }}>
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

      <SubsectionHeader>Display rules</SubsectionHeader>

      <SettingRow label="Label format"
        description="How material names are rendered across every Library mode. Pick a preset or open the full composer for per-category rules.">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 260 }}>
          {previewSample && (
            <div style={{
              padding: '10px 12px',
              border: '1px solid var(--rule-2)',
              background: 'var(--paper-2)',
            }}>
              <Mono size={9} color="var(--ink-4)" style={{ display: 'block',
                letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>
                Preview · {matchedPreset ? matchedPreset.name : 'Custom'}
              </Mono>
              <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic',
                fontSize: 14, color: 'var(--ink)' }}>{previewSample}</span>
            </div>
          )}
          {presets.length > 0 && setLabelTemplates && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {presets.map(p => {
                const isActive = window.templateToText(p.parts) === globalText;
                return (
                  <button key={p.id} type="button"
                    onClick={() => pickPreset(p)}
                    style={{
                      width: '100%', textAlign: 'left',
                      background: isActive ? 'var(--tint)' : 'transparent',
                      border: '1px solid ' + (isActive ? 'var(--ink)' : 'var(--rule-2)'),
                      cursor: 'pointer', padding: '7px 10px',
                      display: 'flex', alignItems: 'baseline', gap: 10,
                    }}>
                    <Mono size={9} color="var(--ink-4)" style={{ minWidth: 90,
                      letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                      {p.name}
                    </Mono>
                    <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic',
                      fontSize: 13, color: 'var(--ink)' }}>
                      {window.templateToText(p.parts)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          <div>
            <button className="st-data-btn"
              onClick={() => onOpenLabelBuilder && onOpenLabelBuilder('Global')}>
              Edit label format
            </button>
            {tplCount > 0 && (
              <Mono size={10} color="var(--ink-4)" style={{ display: 'block', marginTop: 8 }}>
                {tplCount} template{tplCount !== 1 ? 's' : ''} defined
              </Mono>
            )}
          </div>
        </div>
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

const PRESET_EXAMPLES = {
  A: 'Example: PT-01, PT-02, PT-03 …',
  B: 'Example: PT-01, PT-02 (gaps closed on delete)',
  C: 'Example: PT-247 (same on every project)',
  D: 'Example: any code, light validation',
};

function CodesSection({ settings, set, onFindDupes }) {
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
        <div className="codes-preset-list">
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
                  width: 14, height: 14, flexShrink: 0,
                  border: '1.5px solid ' + (active ? 'var(--ink)' : 'var(--rule-2)'),
                  background: active ? 'var(--ink)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {active && <div style={{ width: 5, height: 5, background: 'var(--paper)' }} />}
                </div>
                <div>
                  <span style={{ fontSize: 13, fontWeight: active ? 500 : 400 }}>{p.label}</span>
                  {p.meta && <span className="codes-preset-meta">{p.meta}</span>}
                  {PRESET_EXAMPLES[p.key] && (
                    <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 2 }}>
                      {PRESET_EXAMPLES[p.key]}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
        {!isCustom && (
          <div className="codes-preset-desc">{PRESET_DESCRIPTIONS[preset]}</div>
        )}
      </SettingRow>

      {isCustom && (
        <div className="codes-custom-box">
          <div className="codes-custom-label">Custom settings</div>

          <SubRow label="Code scope">
            <Segmented value={policy.scope || 'project'} onChange={v => setPolicy('scope', v)}
              options={[{ key: 'project', label: 'Per-project' }, { key: 'library', label: 'Office-wide' }]} />
          </SubRow>

          <SubRow label="Auto-assign code on row add">
            <Toggle
              value={policy.autoAssign === 'on' || policy.autoAssign === 'series'
                || policy.autoAssign === 'project-max' || policy.autoAssign === 'library-max'}
              onChange={v => setPolicy('autoAssign', v ? 'on' : 'off')}
              onLabel="On" offLabel="Off" />
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

          {policy.scope === 'library' && (
            <SubRow label="Require code on save">
              <Toggle value={!!policy.requireCodeOnSave} onChange={v => setPolicy('requireCodeOnSave', v)}
                onLabel="Required" offLabel="Optional" />
            </SubRow>
          )}
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

      <SubsectionHeader>Find duplicates</SubsectionHeader>
      <SettingRow label="Find duplicates now"
        description="Scans all materials in the library for similar names and codes, then lets you merge or dismiss pairs.">
        <button className="st-data-btn"
          onClick={() => onFindDupes && onFindDupes()}
          disabled={!window.FindDuplicatesPanel}>
          Find duplicates…
        </button>
      </SettingRow>
    </>
  );
}

Object.assign(window, { LibraryDefaultsSection, CodesSection });
