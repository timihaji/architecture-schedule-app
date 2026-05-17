// proto-app.jsx — root component

function App() {
  const { ui, setUi } = useApp();
  const view = ui.view || 'library';
  const setView = v => setUi({ view: v });

  return (
    <div style={{ position:'fixed', inset:0, background:'var(--paper)', overflow:'hidden', display:'flex', flexDirection:'column' }}>
      {view === 'library'  && <LibraryPage />}
      {view === 'projects' && <ProjectsPage />}
      {view === 'cost'     && <CostPage />}
      {view === 'schedule' && <SchedulePage />}
      {view === 'settings' && <SettingsPage />}
      <BottomNav view={view} setView={setView} />
      <ToastContainer />
    </div>
  );
}

function Root() {
  return React.createElement(
    AppStateProvider, null,
    React.createElement(App)
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(Root));
