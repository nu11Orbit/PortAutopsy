const BASE = {
  fifo:  { throughput: 100, violations: 3, dwell: 4.2, debug: 'manual' },
  agent: { throughput: 123, violations: 0, dwell: 2.8, debug: 'manual' },
  fixed: { throughput: 127, violations: 0, dwell: 2.6, debug: '8 sec' },
};

export default function MetricsPanel({ showFixed = false }) {
  const cols = showFixed
    ? [
        ['FIFO (baseline)', BASE.fifo],
        ['Decentralised', BASE.agent],
        ['After Autopsy fix', BASE.fixed],
      ]
    : [
        ['FIFO (baseline)', BASE.fifo],
        ['Decentralised agents', BASE.agent],
      ];

  const rows = [
    { label: 'Throughput', key: 'throughput', fmt: (v) => `${v}%` },
    { label: 'Cold violations', key: 'violations', fmt: (v) => v },
    { label: 'Avg dwell time', key: 'dwell', fmt: (v) => `${v}h` },
    { label: 'Debug time', key: 'debug', fmt: (v) => v },
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
                  color: '#64748b',
                  borderBottom: '0.5px solid #e2e8f0',
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
              {cols.map(([name, data]) => (
                <td
                  key={name}
                  style={{
                    textAlign: 'right',
                    padding: '6px 8px',
                    color:
                      row.key === 'violations' && data[row.key] > 0 ? '#ef4444' : '#111827',
                  }}
                >
                  {row.fmt(data[row.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
