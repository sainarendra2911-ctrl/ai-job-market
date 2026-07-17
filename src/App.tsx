import { useState } from 'react';
import { AppProvider } from './context/AppContext';
import { Layout, type Screen } from './components/Layout';
import { JobSourceScreen } from './screens/JobSourceScreen';
import { ResumeUploadScreen } from './screens/ResumeUploadScreen';
import { DashboardScreen } from './screens/DashboardScreen';
import { JobExplorerScreen } from './screens/JobExplorerScreen';

function App() {
  const [screen, setScreen] = useState<Screen>('dashboard');

  return (
    <AppProvider>
      <Layout active={screen} onNavigate={setScreen}>
        {screen === 'source' && <JobSourceScreen onNavigate={setScreen} />}
        {screen === 'resume' && <ResumeUploadScreen onNavigate={setScreen} />}
        {screen === 'dashboard' && <DashboardScreen onNavigate={setScreen} />}
        {screen === 'explorer' && <JobExplorerScreen />}
      </Layout>
    </AppProvider>
  );
}

export default App;
