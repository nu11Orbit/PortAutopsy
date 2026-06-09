export default function CounterfactualDiff({ report }) {
  const chain = report?.causal_chain || ['—'];
  const cf = report?.counterfactual || '—';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#ef4444', marginBottom: 6 }}>
          What happened
        </div>
        {chain.map((step, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
            <span
              style={{
                width: 18,
                height: 18,
                borderRadius: '50%',
                background: '#fee2e2',
                color: '#ef4444',
                fontSize: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {i + 1}
            </span>
            <span style={{ fontSize: 12 }}>{step}</span>
          </div>
        ))}
      </div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#22c55e', marginBottom: 6 }}>
          What would have happened
        </div>
        <div
          style={{
            fontSize: 12,
            color: '#15803d',
            padding: 10,
            background: '#f0fdf4',
            borderRadius: 6,
            border: '0.5px solid #bbf7d0',
          }}
        >
          {cf}
        </div>
      </div>
    </div>
  );
}
