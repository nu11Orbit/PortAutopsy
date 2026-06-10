import { useState } from 'react';
import CounterfactualDiff from './CounterfactualDiff';
import CausalGraph from './CausalGraph';
import mockReport from '../mock/autopsy_report.json';

export default function AutopsyPanel({ onReportLoaded }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  const runAutopsy = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/autopsy-report');
      const data = await res.json();
      setReport(data);
      setLoading(false);
      onReportLoaded?.();
    } catch {
      // Fall back to mock for demo
      setTimeout(() => {
        setReport(mockReport);
        setLoading(false);
        onReportLoaded?.();
      }, 800);
    }
  };

  return (
    <div style={{ padding: 16, border: '0.5px solid #e2e8f0', borderRadius: 8 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <h2 style={{ fontSize: 14, fontWeight: 600 }}>Autopsy</h2>
        <button
          onClick={runAutopsy}
          disabled={loading}
          style={{
            fontSize: 12,
            padding: '6px 14px',
            borderRadius: 6,
            background: loading ? '#e2e8f0' : '#3b82f6',
            color: loading ? '#94a3b8' : 'white',
            border: 'none',
            cursor: loading ? 'default' : 'pointer',
          }}
        >
          {loading ? 'Analysing...' : 'Run Autopsy'}
        </button>
      </div>

      {!report && !loading && (
        <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', padding: 24 }}>
          Inject a failure then run autopsy
        </div>
      )}

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '8px 0' }}>
          <div className="skeleton" style={{ height: 120 }} />
          <div className="skeleton" style={{ height: 48 }} />
          <div className="skeleton" style={{ height: 48 }} />
          <div className="skeleton" style={{ height: 16, width: '40%' }} />
        </div>
      )}

      {report && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Render the causal chain graph */}
          <CausalGraph />
          {/* Report card */}
          <div
            style={{
              padding: 12,
              background: '#fef2f2',
              borderRadius: 6,
              border: '0.5px solid #fecaca',
            }}
          >
            <div style={{ fontSize: 11, color: '#ef4444', fontWeight: 600 }}>Root cause</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>
              <strong>{report.root_cause_agent}</strong> — {report.root_cause_decision}
            </div>
          </div>
          <div
            style={{
              padding: 12,
              background: '#f0fdf4',
              borderRadius: 6,
              border: '0.5px solid #bbf7d0',
            }}
          >
            <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 600 }}>Suggested fix</div>
            <code style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
              {report.suggested_fix}
            </code>
          </div>
          <div style={{ fontSize: 11, color: '#64748b' }}>
            Confidence: <strong>{Math.round(report.confidence * 100)}%</strong>
          </div>
          <CounterfactualDiff report={report} />
        </div>
      )}
    </div>
  );
}
