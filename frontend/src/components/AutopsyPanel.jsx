import { useState } from 'react';
import CounterfactualDiff from './CounterfactualDiff';
import CausalGraph from './CausalGraph';
import mockReport from '../mock/autopsy_report.json';

export default function AutopsyPanel({ onReportLoaded }) {
  const [report, setReport]   = useState(null);
  const [loading, setLoading] = useState(false);

  const runAutopsy = async () => {
    setLoading(true);
    try {
      const res  = await fetch('http://localhost:8000/autopsy-report');
      const data = await res.json();
      setReport(data);
      setLoading(false);
      onReportLoaded?.();
    } catch {
      setTimeout(() => {
        setReport(mockReport);
        setLoading(false);
        onReportLoaded?.();
      }, 900);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="section-header">
        <span className="section-title">Diagnostics</span>
        <button
          className="btn btn-primary"
          style={{ marginLeft: 'auto', padding: '7px 16px', fontSize: 12 }}
          onClick={runAutopsy}
          disabled={loading}
        >
          {loading ? <>⟳ Analyzing…</> : <>▶ Run Autopsy</>}
        </button>
      </div>

      {/* Empty state */}
      {!report && !loading && (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 10, padding: '36px 20px',
          border: '1px dashed rgba(255,255,255,0.08)',
          borderRadius: 'var(--r)',
          background: 'rgba(255,255,255,0.02)',
          backdropFilter: 'blur(6px)',
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
            stroke="rgba(45,212,191,0.3)" strokeWidth="1.5" strokeLinecap="round">
            <circle cx="11" cy="11" r="8"/>
            <path d="M21 21l-4.35-4.35"/>
            <path d="M11 8v6M8 11h6"/>
          </svg>
          <div style={{ fontSize: 13, color: 'var(--t2)', fontWeight: 500 }}>No Active Diagnosis</div>
          <div style={{ fontSize: 12, color: 'var(--t3)', textAlign: 'center', lineHeight: 1.5 }}>
            Click Run Autopsy to trace a fault<br/>scenario through the causal chain.
          </div>
        </div>
      )}

      {/* Loading skeletons */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="skeleton" style={{ height: 150 }} />
          <div className="skeleton" style={{ height: 60 }} />
          <div className="skeleton" style={{ height: 60 }} />
          <div className="skeleton" style={{ height: 6, width: '100%' }} />
        </div>
      )}

      {/* Report */}
      {report && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          <CausalGraph />

          <div className="block-red">
            <div className="info-label" style={{ color: 'var(--rose)' }}>Fault Origin</div>
            <div style={{ fontSize: 13, color: 'var(--t1)', lineHeight: 1.6, marginTop: 5 }}>
              <span style={{
                display: 'inline-block',
                background: 'rgba(251,113,133,0.08)', color: 'var(--rose)',
                padding: '2px 8px', borderRadius: 4, marginRight: 8,
                fontSize: 11, fontFamily: 'var(--mono)', fontWeight: 600,
              }}>
                {report.root_cause_agent}
              </span>
              {report.root_cause_decision}
            </div>
          </div>

          <div className="block-green">
            <div className="info-label" style={{ color: 'var(--teal)' }}>Suggested Fix</div>
            <code style={{
              color: 'var(--t1)', display: 'block', marginTop: 5,
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              lineHeight: 1.65, fontSize: 12,
            }}>
              {report.suggested_fix}
            </code>
          </div>

          {/* Confidence */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 11, color: 'var(--t3)', whiteSpace: 'nowrap' }}>Confidence</span>
            <div className="conf-track">
              <div className="conf-fill" style={{ width: `${Math.round(report.confidence * 100)}%` }} />
            </div>
            <span style={{
              fontSize: 13, fontWeight: 600,
              color: '#2DD4BF',
              whiteSpace: 'nowrap',
              fontFamily: 'var(--mono)',
            }}>
              {Math.round(report.confidence * 100)}%
            </span>
          </div>

          <CounterfactualDiff report={report} />
        </div>
      )}
    </div>
  );
}
