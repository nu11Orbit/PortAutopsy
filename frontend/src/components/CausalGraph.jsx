import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import mockGraph from '../mock/causal_graph.json';

export default function CausalGraph({ apiUrl = 'http://localhost:8000/causal-graph' }) {
  const ref = useRef();
  const [data, setData] = useState(mockGraph);
  const [selectedNode, setSelectedNode] = useState(null);

  useEffect(() => {
    fetch(apiUrl).then(r => r.json()).then(d => { if (d?.nodes?.length) setData(d); }).catch(() => {});
  }, [apiUrl]);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = '';
    const el = ref.current;
    const W = el.clientWidth || 440, H = 160;

    const svg = d3.select(el).append('svg').attr('width', '100%').attr('height', H);
    const defs = svg.append('defs');

    ['fail', 'ok'].forEach(type => {
      defs.append('marker')
        .attr('id', `arr-${type}`).attr('viewBox', '0 0 8 8').attr('refX', 24).attr('refY', 4)
        .attr('markerWidth', 4).attr('markerHeight', 4).attr('orient', 'auto')
        .append('path').attr('d', 'M0,0L8,4L0,8').attr('fill', 'none')
        .attr('stroke', type === 'fail' ? '#FB7185' : 'rgba(45,212,191,0.5)').attr('stroke-width', 1.5);
    });

    const nodes = (data.nodes || []).map(n => ({ ...n }));
    const edges = (data.edges || data.links || []).map(e => ({ ...e }));

    const sim = d3.forceSimulation(nodes)
      .force('link',   d3.forceLink(edges).id(d => d.id).distance(120))
      .force('charge', d3.forceManyBody().strength(-320))
      .force('center', d3.forceCenter(W / 2, H / 2))
      .force('collide', d3.forceCollide(30));

    const edgeG = svg.append('g');
    const link = edgeG.selectAll('line').data(edges).join('line')
      .attr('stroke-width', 1.5)
      .attr('stroke', d => {
        const src = nodes.find(n => n.id === (d.source?.id || d.source));
        return src?.is_failure ? 'rgba(251,113,133,0.5)' : 'rgba(45,212,191,0.25)';
      })
      .attr('stroke-dasharray', d => d.effect_type === 'sequential' ? '4 4' : null)
      .attr('marker-end', d => {
        const src = nodes.find(n => n.id === (d.source?.id || d.source));
        return src?.is_failure ? 'url(#arr-fail)' : 'url(#arr-ok)';
      });

    const nodeG = svg.append('g');
    const node = nodeG.selectAll('g').data(nodes).join('g')
      .attr('cursor', 'pointer')
      .on('click', (_, d) => setSelectedNode(p => p?.id === d.id ? null : d))
      .call(d3.drag()
        .on('start', (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on('drag',  (e, d) => { d.fx = e.x; d.fy = e.y; })
        .on('end',   (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null; })
      );

    node.append('circle').attr('r', 20)
      .attr('fill', d => d.is_failure ? 'rgba(251,113,133,0.12)' : 'rgba(45,212,191,0.10)')
      .attr('stroke', d => d.is_failure ? '#FB7185' : 'rgba(45,212,191,0.55)')
      .attr('stroke-width', 2)
      .style('filter', d => d.is_failure
        ? 'drop-shadow(0 0 6px rgba(251,113,133,0.4))'
        : 'drop-shadow(0 0 6px rgba(45,212,191,0.3))');

    node.append('text')
      .text(d => (d.agent_id || '?').replace('container_', 'C-').replace('constraint_parser', 'PAR').slice(0, 5))
      .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
      .attr('font-size', 10).attr('font-weight', 600).attr('font-family', 'Outfit, sans-serif')
      .attr('fill', d => d.is_failure ? '#FB7185' : '#2DD4BF');

    sim.on('tick', () => {
      link
        .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    return () => sim.stop();
  }, [data]);

  return (
    <div>
      <div className="info-label">Causal Graph</div>
      <div ref={ref} style={{
        marginTop: 8,
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 'var(--r-sm)',
        background: 'rgba(2,6,23,0.50)',
        backdropFilter: 'blur(12px)',
        overflow: 'hidden', minHeight: 160
      }} />
      {selectedNode && (
        <div className="node-inspector">
          <div><div className="info-label">Node</div><span style={{ fontSize: 12, fontFamily: 'var(--mono)', fontWeight: 500 }}>{selectedNode.agent_id}</span></div>
          <div><div className="info-label">Seq</div><span style={{ fontSize: 12 }}>{selectedNode.round}</span></div>
          <div>
            <div className="info-label">State</div>
            <span style={{ fontSize: 12, fontWeight: 600 }} className={selectedNode.is_failure ? 'text-danger' : 'text-mint'}>
              {selectedNode.is_failure ? 'Failed' : 'Healthy'}
            </span>
          </div>
          {selectedNode.chain_of_thought && (
            <div style={{ flex: 1, borderLeft: '1px solid rgba(255,255,255,0.08)', paddingLeft: 14 }}>
              <div className="info-label">Trace</div>
              <span style={{ fontSize: 11, color: 'var(--text-mid)' }}>{String(selectedNode.chain_of_thought).slice(0, 100)}...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
