import { useCountUp } from '../hooks/useCountUp';

const BASE = {
  fifo:  { throughput: 100, violations: 3, dwell: 4.2, debug: 'Manual' },
  agent: { throughput: 123, violations: 0, dwell: 2.8, debug: 'Manual' },
  fixed: { throughput: 127, violations: 0, dwell: 2.6, debug: '8 sec'  },
};

const rows = [
  { label: 'Throughput',  key: 'throughput', fmt: v => `${v}%` },
  { label: 'Cold Faults', key: 'violations', fmt: v => v },
  { label: 'Avg Dwell',   key: 'dwell',      fmt: v => `${v}h` },
  { label: 'Diag. Time',  key: 'debug',      fmt: v => v },
];

function AnimatedCell({ value, fmt, animate }) {
  const n = useCountUp(typeof value === 'number' ? value : 0, 900, animate);
  return <>{fmt(typeof value === 'number' ? n : value)}</>;
}

export default function MetricsPanel({ showFixed = false }) {
  const cols = showFixed
    ? [['FIFO', BASE.fifo, false], ['Agents', BASE.agent, false], ['Patched', BASE.fixed, true]]
    : [['FIFO', BASE.fifo, false], ['Agents', BASE.agent, false]];

  const agentGain = BASE.agent.throughput - BASE.fifo.throughput;
  const fixGain   = BASE.fixed.throughput - BASE.fifo.throughput;

  return (
    <div>
      <div className="section-header">
        <span className="section-title">System Metrics</span>
        {showFixed && (
          <span className="tag tag-mint" style={{ marginLeft: 'auto' }}>
            ✓ Patch Applied
          </span>
        )}
      </div>

      {/* Delta KPI strip */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: showFixed ? 'repeat(3,1fr)' : 'repeat(2,1fr)',
        gap: 8, marginBottom: 16
      }}>
        {/* Baseline */}
        <div className="kpi-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 17, fontWeight: 300, color: 'var(--t3)' }}>—</div>
          <div style={{ fontSize: 10, color: 'var(--t3)', marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Baseline</div>
        </div>

        {/* Agent lift */}
        <div className="kpi-card" style={{ textAlign: 'center', borderColor: 'rgba(103,232,249,0.2)' }}>
          <div style={{ fontSize: 17, fontWeight: 600, color: '#67E8F9' }}>
            +{agentGain}%
          </div>
          <div style={{ fontSize: 10, color: 'var(--t2)', marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Agent Lift</div>
        </div>

        {/* Fixed lift */}
        {showFixed && (
          <div className="kpi-card" style={{ textAlign: 'center', borderColor: 'rgba(45,212,191,0.25)' }}>
            <div style={{ fontSize: 17, fontWeight: 600, color: '#2DD4BF' }}>
              +{fixGain}%
            </div>
            <div style={{ fontSize: 10, color: 'var(--t2)', marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Final Lift</div>
          </div>
        )}
      </div>

      {/* Metrics table */}
      <table className="metrics-table">
        <thead>
          <tr>
            {['Metric', ...cols.map(([n]) => n)].map((h, i) => (
              <th key={i}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.key}>
              <td>{row.label}</td>
              {cols.map(([name, data, animate]) => (
                <td
                  key={name}
                  style={{
                    color: row.key === 'violations' && data[row.key] > 0
                      ? 'var(--rose)'
                      : animate
                        ? 'var(--teal)'
                        : name === 'Agents' && row.key !== 'violations'
                          ? 'var(--cyan)'
                          : undefined,
                    fontWeight: animate ? 600 : 400,
                  }}
                >
                  <AnimatedCell value={data[row.key]} fmt={row.fmt} animate={animate && showFixed} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
