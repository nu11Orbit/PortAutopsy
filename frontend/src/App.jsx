import { useState } from 'react';
import PortMap from './components/PortMap';
import AgentTimeline from './components/AgentTimeline';
import MetricsPanel from './components/MetricsPanel';
import AutopsyPanel from './components/AutopsyPanel';

export default function App() {
  // When AutopsyPanel loads a report, flip showFixed → MetricsPanel animates the Fix column
  const [showFixed, setShowFixed] = useState(false);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, padding: 16 }}>
      <PortMap />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <MetricsPanel showFixed={showFixed} />
        <AutopsyPanel onReportLoaded={() => setShowFixed(true)} />
      </div>
      <div style={{ gridColumn: '1 / -1' }}>
        <AgentTimeline />
      </div>
    </div>
  );
}
