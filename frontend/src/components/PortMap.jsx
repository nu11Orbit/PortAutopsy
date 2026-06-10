import { useEventStream } from '../hooks/useEventStream';
import mockTraces from '../mock/traces.json';

const BERTHS = 4;
const CRANES = 6;
const CW = 96, CH = 58;
const ML = 46, MT = 38;

const CARGO = {
  cold_chain: {
    color: '#67E8F9',
    fill: 'rgba(103,232,249,0.10)',
    border: 'rgba(103,232,249,0.45)',
    label: 'COLD',
    dot: '#67E8F9',
    glow: 'rgba(103,232,249,0.25)',
  },
  hazmat: {
    color: '#FCD34D',
    fill: 'rgba(252,211,77,0.10)',
    border: 'rgba(252,211,77,0.45)',
    label: 'HMZT',
    dot: '#FCD34D',
    glow: 'rgba(252,211,77,0.20)',
  },
  standard: {
    color: '#2DD4BF',
    fill: 'rgba(45,212,191,0.07)',
    border: 'rgba(45,212,191,0.28)',
    label: 'STD',
    dot: '#2DD4BF',
    glow: 'rgba(45,212,191,0.15)',
  },
};

function getCargoType(e) {
  return e?.inputs?.container?.cargo_type ?? 'standard';
}

export default function PortMap() {
  const { events, connected } = useEventStream();
  const activeEvents = !connected && events.length === 0 ? mockTraces : events;

  const allocations = {};
  activeEvents.forEach(e => {
    if (e.output?.action === 'BID' && e.output?.slot) {
      allocations[e.output.slot] = { agentId: e.agent_id, cargoType: getCargoType(e) };
    }
  });

  const hasViolation = activeEvents.some(e => {
    const c = e?.inputs?.container;
    return c?.cargo_type === 'cold_chain' && c?.temperature_constraint === null;
  });

  const totalAlloc = Object.keys(allocations).length;
  const totalSlots = BERTHS * CRANES;
  const utilPct    = Math.round(totalAlloc / totalSlots * 100);

  const svgW = ML + CRANES * CW + 16;
  const svgH = MT + BERTHS * CH + 16;

  return (
    <div>
      {/* Section header */}
      <div className="section-header">
        <span className="section-title">Terminal Grid</span>
        {hasViolation && <span className="tag tag-red">⚠ Breach</span>}
        <span style={{ fontSize: 11, color: connected ? '#2DD4BF' : 'var(--t3)', marginLeft: 4 }}>
          {connected ? '● Live' : '○ Mock'}
        </span>
        {/* Legend */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 14, alignItems: 'center' }}>
          {Object.entries(CARGO).map(([type, cfg]) => (
            <span key={type} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 11, color: 'var(--t2)'
            }}>
              <span style={{
                width: 10, height: 10, borderRadius: 3,
                background: cfg.dot,
                boxShadow: `0 0 6px ${cfg.glow}`,
                display: 'inline-block'
              }} />
              {cfg.label}
            </span>
          ))}
        </div>
      </div>

      {/* KPI strip */}
      <div className="kpi-row">
        <div className="kpi-card">
        <div className="kpi-val" style={{ color: '#2DD4BF' }}>
            {totalAlloc}
          </div>
          <div className="kpi-lbl">Slots Allocated</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-val" style={{
            color: hasViolation ? 'var(--rose)' : 'var(--teal)',
          }}>
            {hasViolation ? '1' : '0'}
          </div>
          <div className="kpi-lbl">Cold Breaches</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-val" style={{ color: 'var(--t1)' }}>{utilPct}%</div>
          <div className="kpi-lbl">Utilization</div>
        </div>
      </div>

      {/* SVG grid — fills card width via viewBox */}
      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        width="100%"
        height={svgH}
        style={{ display: 'block', overflow: 'visible' }}
      >
        {/* Subtle grid lines */}
        {Array.from({ length: CRANES + 1 }, (_, i) => (
          <line
            key={`vl-${i}`}
            x1={ML + i * CW} y1={MT - 8}
            x2={ML + i * CW} y2={MT + BERTHS * CH + 4}
            stroke="rgba(255,255,255,0.04)" strokeWidth={1}
          />
        ))}
        {Array.from({ length: BERTHS + 1 }, (_, i) => (
          <line
            key={`hl-${i}`}
            x1={ML - 8} y1={MT + i * CH}
            x2={ML + CRANES * CW + 4} y2={MT + i * CH}
            stroke="rgba(255,255,255,0.04)" strokeWidth={1}
          />
        ))}

        {/* Column headers */}
        {Array.from({ length: CRANES }, (_, c) => (
          <text
            key={c}
            x={ML + c * CW + (CW - 8) / 2}
            y={MT - 16}
            textAnchor="middle"
            fontSize={11}
            fontWeight={600}
            fill="rgba(148,163,184,0.5)"
            fontFamily="Outfit, sans-serif"
            letterSpacing="0.05em"
          >
            C-{c + 1}
          </text>
        ))}

        {/* Cells */}
        {Array.from({ length: BERTHS }, (_, b) =>
          Array.from({ length: CRANES }, (_, c) => {
            const craneId = `crane_${b * CRANES + c}`;
            const x = ML + c * CW;
            const y = MT + b * CH;
            const alloc = allocations[craneId];
            const cfg   = CARGO[alloc?.cargoType ?? 'standard'];

            return (
              <g key={craneId}>
                {/* Cell background */}
                <rect
                  x={x + 4} y={y + 4}
                  width={CW - 8} height={CH - 8}
                  rx={10} ry={10}
                  fill={alloc ? cfg.fill : 'rgba(255,255,255,0.025)'}
                  stroke={alloc ? cfg.border : 'rgba(255,255,255,0.07)'}
                  strokeWidth={1.5}
                />
                {/* Glow border for active cells — removed, border color is enough */}
                {alloc && (
                  <>
                    {/* Container ID */}
                    <text
                      x={x + CW / 2} y={y + CH / 2 - 5}
                      textAnchor="middle" dominantBaseline="central"
                      fontSize={10} fontWeight={600}
                      fill={cfg.color}
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {alloc.agentId.replace('container_', '#')}
                    </text>
                    {/* Type label */}
                    <text
                      x={x + CW / 2} y={y + CH / 2 + 9}
                      textAnchor="middle" dominantBaseline="central"
                      fontSize={9} fill="rgba(148,163,184,0.45)"
                      fontFamily="Outfit, sans-serif"
                      letterSpacing="0.06em"
                    >
                      {cfg.label}
                    </text>
                    {/* Status dot */}
                    <circle
                      cx={x + CW - 12} cy={y + 12}
                      r={2.5}
                      fill={cfg.dot}
                    />
                  </>
                )}
              </g>
            );
          })
        )}

        {/* Row labels */}
        {Array.from({ length: BERTHS }, (_, b) => (
          <text
            key={b}
            x={ML - 10}
            y={MT + b * CH + CH / 2}
            textAnchor="end"
            dominantBaseline="central"
            fontSize={11}
            fontWeight={600}
            fill="rgba(148,163,184,0.45)"
            fontFamily="Outfit, sans-serif"
            letterSpacing="0.05em"
          >
            B-{b + 1}
          </text>
        ))}
      </svg>
    </div>
  );
}
