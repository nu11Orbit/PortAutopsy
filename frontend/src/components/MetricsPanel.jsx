import { useCountUp } from '../hooks/useCountUp';

const BASE = {
  fifo:  { throughput: 100, violations: 3, dwell: 4.2, debug: 'manual' },
  agent: { throughput: 123, violations: 0, dwell: 2.8, debug: 'manual' },
  fixed: { throughput: 127, violations: 0, dwell: 2.6, debug: '8 sec' },
};

const rows = [
  { label: 'Throughput',      key: 'throughput', fmt: (v) => `${v}%` },
  { label: 'Cold violations', key: 'violations', fmt: (v) => v       },
  { label: 'Avg dwell time',  key: 'dwell',      fmt: (v) => `${v}h` },
  { label: 'Debug time',      key: 'debug',      fmt: (v) => v       },
];

/**
 * Animated cell — counts up when the Fix column appears.
 */
function AnimatedCell({ value, fmt, animate }) {
  const animated = useCountUp(
    typeof value === 'number' ? value : 0,
    600,
    animate
  );
  const display = typeof value === 'number' ? animated : value;
  return <>{fmt(display)}</>;
}

export default function MetricsPanel({ showFixed = false }) {
  const cols = showFixed
    ? [
        ['FIFO (baseline)',    BASE.fifo,  false],
        ['Decentralised',      BASE.agent, false],
        ['After Autopsy fix',  BASE.fixed, true ],  // ← animate this column
      ]
    : [
        ['FIFO (baseline)',    BASE.fifo,  false],
        ['Decentralised agents', BASE.agent, false],
      ];

  return (
    <div>
      <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Metrics</h2>
      <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {['Metric', ...cols.map(([name]) => name)].map((h, i) => (
              <th
                key={i}
                style={{
                  textAlign: i === 0 ? 'left' : 'right',
                  padding: '4px 8px',
                  fontWeight: 500,
                  color: i === cols.length && showFixed ? '#16a34a' : '#64748b',
                  borderBottom: '0.5px solid #e2e8f0',
                  // Slide-in for the Fix column
                  animation:
                    i === cols.length && showFixed
                      ? 'cell-appear 0.35s ease-out both'
                      : 'none',
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <td style={{ padding: '6px 8px', color: '#374151' }}>{row.label}</td>
              {cols.map(([name, data, animate]) => (
                <td
                  key={name}
                  style={{
                    textAlign: 'right',
                    padding: '6px 8px',
                    fontWeight: animate ? 600 : 400,
                    color:
                      row.key === 'violations' && data[row.key] > 0
                        ? '#ef4444'
                        : animate
                        ? '#16a34a'
                        : '#111827',
                    animation:
                      animate ? 'cell-appear 0.35s ease-out both' : 'none',
                  }}
                >
                  <AnimatedCell
                    value={data[row.key]}
                    fmt={row.fmt}
                    animate={animate && showFixed}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
