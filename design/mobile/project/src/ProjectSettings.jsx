// ProjectSettings — Project defaults section.

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

Object.assign(window, { ProjectDefaultsSection });
