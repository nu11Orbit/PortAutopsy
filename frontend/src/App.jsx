import PortMap from './components/PortMap';
import AgentTimeline from './components/AgentTimeline';
import MetricsPanel from './components/MetricsPanel';
import AutopsyPanel from './components/AutopsyPanel';

export default function App() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, padding: 16 }}>
      <PortMap />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <MetricsPanel />
        <AutopsyPanel />
      </div>
      <AgentTimeline style={{ gridColumn: '1 / -1' }} />
    </div>
  );
}
