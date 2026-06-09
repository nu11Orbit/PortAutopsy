import { useEventStream } from '../hooks/useEventStream';

const BERTHS = 4;
const CRANES_PER_BERTH = 6;
const CELL_W = 80;
const CELL_H = 50;
const MARGIN = 40;

const CARGO_COLORS = {
  cold_chain: '#60a5fa',
  hazmat: '#f97316',
  standard: '#86efac',
};

export default function PortMap() {
  const { events, connected } = useEventStream();

  // Build allocation map from events
  const allocations = {};
  events.forEach((e) => {
    if (e.output?.action === 'BID' && e.output?.slot) {
      allocations[e.output.slot] = e.agent_id;
    }
  });

  const width = CRANES_PER_BERTH * CELL_W + MARGIN * 2;
  const height = BERTHS * CELL_H + MARGIN * 2 + 30;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600 }}>Port Live View</h2>
        <span style={{ fontSize: 11, color: connected ? 'green' : 'gray' }}>
          {connected ? '● live' : '○ connecting'}
        </span>
      </div>
      <svg width={width} height={height}>
        {Array.from({ length: BERTHS }, (_, b) =>
          Array.from({ length: CRANES_PER_BERTH }, (_, c) => {
            const crane_id = `crane_${b * CRANES_PER_BERTH + c}`;
            const x = MARGIN + c * CELL_W;
            const y = MARGIN + b * CELL_H + 20;
            const agent = allocations[crane_id];
            return (
              <g key={crane_id}>
                <rect
                  x={x}
                  y={y}
                  width={CELL_W - 4}
                  height={CELL_H - 4}
                  fill={agent ? CARGO_COLORS.standard : '#f1f5f9'}
                  stroke="#cbd5e1"
                  strokeWidth={0.5}
                  rx={4}
                />
                {agent && (
                  <text
                    x={x + (CELL_W - 4) / 2}
                    y={y + (CELL_H - 4) / 2}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={9}
                    fill="#1e293b"
                  >
                    {agent.replace('container_', 'C')}
                  </text>
                )}
              </g>
            );
          })
        )}
        {Array.from({ length: BERTHS }, (_, b) => (
          <text
            key={b}
            x={8}
            y={MARGIN + b * CELL_H + CELL_H / 2 + 20}
            fontSize={11}
            fill="#64748b"
          >
            B{b}
          </text>
        ))}
      </svg>
    </div>
  );
}
