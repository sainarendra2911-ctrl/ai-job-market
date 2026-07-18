import { useState } from 'react';
import { AppProvider } from './context/AppContext';
import { Layout } from './components/Layout';
import { JobSourceScreen } from './screens/JobSourceScreen';
import { ResumeUploadScreen } from './screens/ResumeUploadScreen';
import { DashboardScreen } from './screens/DashboardScreen';
import { JobExplorerScreen } from './screens/JobExplorerScreen';
import RecentActivityTimeline from "./screens/RecentActivityTimeline"
import TrendingSkills from "./screens/TrendingSkills"

function App() {
  const [screen, setScreen] = useState('dashboard');

  return (
    <AppProvider>
      <Layout active={screen} onNavigate={setScreen}>
        {screen === 'source' && <JobSourceScreen onNavigate={setScreen} />}
        {screen === 'resume' && <ResumeUploadScreen onNavigate={setScreen} />}
        {screen === 'dashboard' && <DashboardScreen onNavigate={setScreen} />}
        {screen === 'explorer' && <JobExplorerScreen />}

        {screen === 'recent' && <RecentActivityTimeline />}
        {screen === 'trending' && <TrendingSkills />}
      </Layout>
    </AppProvider>
  );
}

export default App;
