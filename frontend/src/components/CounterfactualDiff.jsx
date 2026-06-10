export default function CounterfactualDiff({ report }) {
  if (!report) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="info-label">Counterfactual Analysis</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="block-red" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="info-label" style={{ color: 'var(--rose)' }}>What happened</div>
          {(report.causal_chain || []).map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--rose)', minWidth: 16, flexShrink: 0, fontFamily: 'var(--mono)', paddingTop: 2 }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <span style={{ fontSize: 12, color: 'var(--t2)', lineHeight: 1.5 }}>{step}</span>
            </div>
          ))}
        </div>
        <div className="block-green" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="info-label" style={{ color: 'var(--teal)' }}>With the fix</div>
          <p style={{ fontSize: 12, color: 'var(--t2)', lineHeight: 1.6 }}>{report.counterfactual}</p>
          <div style={{
            marginTop: 'auto', padding: '8px 14px',
            background: 'rgba(45,212,191,0.08)', border: '1px solid rgba(45,212,191,0.3)',
            borderRadius: 8, color: 'var(--teal)', fontWeight: 600, fontSize: 12, textAlign: 'center',
            textShadow: '0 0 10px rgba(45,212,191,0.4)',
          }}>
            ✓ Outcome: Nominal
          </div>
        </div>
      </div>
    </div>
  );
}
