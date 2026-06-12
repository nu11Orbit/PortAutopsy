import { useState, useEffect, useRef } from 'react';
import { useCountUp } from '../hooks/useCountUp';

// ── Static fallback / baseline values ─────────────────────────────────────
// These are used when the backend has no traces yet (pre-simulation).
// Once the server responds from /metrics, live agent data overrides the
// agent column while FIFO stays as the "baseline" anchor.
const FALLBACK = {
  fifo:  { throughput: 100, violations: 3, dwell: 4.2, debug: 'Manual' },
  agent: { throughput: 123, violations: 0, dwell: 2.8, debug: '8 sec (autopsy)' },
  fixed: { throughput: 127, violations: 0, dwell: 2.6, debug: '8 sec (autopsy)' },
};

const ROWS = [
  { label: 'Throughput',  key: 'throughput', fmt: v => `${v}%` },
  { label: 'Cold Faults', key: 'violations', fmt: v => v },
  { label: 'Avg Dwell',   key: 'dwell',      fmt: v => `${v}h` },
  { label: 'Diag. Time',  key: 'debug',      fmt: v => v },
];

// ── Animated number cell ───────────────────────────────────────────────────
function AnimatedCell({ value, fmt, animate }) {
  const n = useCountUp(typeof value === 'number' ? value : 0, 900, animate);
  return <>{fmt(typeof value === 'number' ? n : value)}</>;
}

// ── Poll /metrics every 5 s ───────────────────────────────────────────────
function useMetrics(apiUrl = 'http://localhost:8000/metrics') {
  const [liveAgent, setLiveAgent]   = useState(null); // null = not yet fetched
  const [liveFifo,  setLiveFifo]    = useState(null);
  const [status,    setStatus]      = useState('idle'); // 'idle' | 'live' | 'error'
  const timerRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    const fetch_ = () => {
      fetch(apiUrl)
        .then(r => r.json())
        .then(data => {
          if (!mounted) return;
          // Server returns { agent: {...}, fifo: {...} }
          // Only update if the response has real data (not an error or empty object)
          if (data?.agent && Object.keys(data.agent).length > 0 && !data.error) {
            setLiveAgent(data.agent);
            setStatus('live');
          }
          if (data?.fifo && Object.keys(data.fifo).length > 0) {
            setLiveFifo(data.fifo);
          }
        })
        .catch(() => {
          if (mounted) setStatus('error');
        });
    };

    fetch_(); // immediate first fetch
    timerRef.current = setInterval(fetch_, 5000);

    return () => {
      mounted = false;
      clearInterval(timerRef.current);
    };
  }, [apiUrl]);

  return { liveAgent, liveFifo, status };
}

// ── Component ─────────────────────────────────────────────────────────────
export default function MetricsPanel({ showFixed = false }) {
  const { liveAgent, liveFifo, status } = useMetrics();

  // Merge live data over the static fallbacks.
  // FIFO is kept as the "baseline" anchor (live FIFO only updates if server gives it).
  const fifo  = { ...FALLBACK.fifo,  ...(liveFifo  || {}) };
  const agent = { ...FALLBACK.agent, ...(liveAgent  || {}) };
  const fixed = { ...FALLBACK.fixed };

  // Recompute deltas from actual numbers
  const agentGain = agent.throughput - fifo.throughput;
  const fixGain   = fixed.throughput - fifo.throughput;

  const cols = showFixed
    ? [['FIFO', fifo, false], ['Agents', agent, false], ['Patched', fixed, true]]
    : [['FIFO', fifo, false], ['Agents', agent, false]];

  return (
    <div>
      {/* ── Header ── */}
      <div className="section-header">
        <span className="section-title">System Metrics</span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
          {/* Live data indicator */}
          {status === 'live' && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              fontSize: 10, color: 'var(--teal)',
              background: 'rgba(45,212,191,0.08)',
              border: '1px solid rgba(45,212,191,0.2)',
              borderRadius: 20, padding: '2px 8px',
            }}>
              <span style={{
                width: 5, height: 5, borderRadius: '50%',
                background: 'var(--teal)',
                boxShadow: '0 0 6px var(--teal)',
                animation: 'pulse 2s infinite',
                flexShrink: 0,
              }} />
              Live
            </span>
          )}
          {status === 'error' && (
            <span style={{
              fontSize: 10, color: 'var(--text-mid)',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 20, padding: '2px 8px',
            }}>
              Offline — using defaults
            </span>
          )}
          {showFixed && (
            <span className="tag tag-mint">✓ Patch Applied</span>
          )}
        </div>
      </div>

      {/* ── Delta KPI strip ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: showFixed ? 'repeat(3,1fr)' : 'repeat(2,1fr)',
        gap: 8, marginBottom: 16,
      }}>
        {/* Baseline — shows FIFO throughput as the reference anchor */}
        <div className="kpi-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--t2)' }}>
            {fifo.throughput}%
          </div>
          <div style={{
            fontSize: 10, color: 'var(--t3)', marginTop: 3,
            textTransform: 'uppercase', letterSpacing: '0.08em',
          }}>FIFO Baseline</div>
        </div>

        {/* Agent lift */}
        <div className="kpi-card" style={{ textAlign: 'center', borderColor: 'rgba(103,232,249,0.2)' }}>
          <div style={{ fontSize: 17, fontWeight: 600, color: '#67E8F9' }}>
            {agentGain >= 0 ? '+' : ''}{agentGain}%
          </div>
          <div style={{
            fontSize: 10, color: 'var(--t2)', marginTop: 3,
            textTransform: 'uppercase', letterSpacing: '0.08em',
          }}>Agent Lift</div>
        </div>

        {/* Patched lift */}
        {showFixed && (
          <div className="kpi-card" style={{ textAlign: 'center', borderColor: 'rgba(45,212,191,0.25)' }}>
            <div style={{ fontSize: 17, fontWeight: 600, color: '#2DD4BF' }}>
              {fixGain >= 0 ? '+' : ''}{fixGain}%
            </div>
            <div style={{
              fontSize: 10, color: 'var(--t2)', marginTop: 3,
              textTransform: 'uppercase', letterSpacing: '0.08em',
            }}>Final Lift</div>
          </div>
        )}
      </div>

      {/* ── Metrics table ── */}
      <table className="metrics-table">
        <thead>
          <tr>
            {['Metric', ...cols.map(([n]) => n)].map((h, i) => (
              <th key={i}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map(row => (
            <tr key={row.key}>
              <td>{row.label}</td>
              {cols.map(([name, data, animate]) => (
                <td
                  key={name}
                  style={{
                    color:
                      row.key === 'violations' && data[row.key] > 0
                        ? 'var(--rose)'
                        : animate
                          ? 'var(--teal)'
                          : name === 'Agents' && row.key !== 'violations'
                            ? 'var(--cyan)'
                            : undefined,
                    fontWeight: animate ? 600 : 400,
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
