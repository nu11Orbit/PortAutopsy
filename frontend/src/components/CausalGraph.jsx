import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import mockGraph from '../mock/causal_graph.json';

export default function CausalGraph({ apiUrl = 'http://localhost:8000/causal-graph' }) {
  const ref = useRef();
  const [data, setData] = useState(mockGraph);
  const [selectedNode, setSelectedNode] = useState(null);

  useEffect(() => {
    fetch(apiUrl)
      .then(r => r.json())
      .then(d => {
        if (d && d.nodes) setData(d);
      })
      .catch(() => setData(mockGraph)); // Fallback to mock when A3's server is down
  }, [apiUrl]);

  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    el.innerHTML = '';
    const W = 500, H = 300;
    const svg = d3.select(el).append('svg').attr('width', '100%').attr('height', H);

    const nodeColor = (d) => (d.is_failure ? '#ef4444' : '#60a5fa');

    // Deep-copy nodes/edges so D3 can mutate them freely
    const nodes = data.nodes.map((n) => ({ ...n }));
    const edges = data.edges.map((e) => ({ ...e }));

    const sim = d3
      .forceSimulation(nodes)
      .force('link', d3.forceLink(edges).id((d) => d.id).distance(140))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(W / 2, H / 2));

    svg
      .append('defs')
      .append('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 0 10 10')
      .attr('refX', 18)
      .attr('refY', 5)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto-start-reverse')
      .append('path')
      .attr('d', 'M2 1L8 5L2 9')
      .attr('fill', 'none')
      .attr('stroke', '#94a3b8')
      .attr('stroke-width', 1.5);

    const linkGroup = svg
      .append('g')
      .selectAll('g')
      .data(edges)
      .join('g');

    const link = linkGroup
      .append('line')
      .attr('stroke', '#94a3b8')
      .attr('stroke-width', 1)
      .attr('marker-end', 'url(#arrow)');

    const edgeLabel = linkGroup
      .append('text')
      .text((d) => d.label || '')
      .attr('font-size', 10)
      .attr('fill', '#64748b')
      .attr('text-anchor', 'middle');

    const node = svg
      .append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('cursor', 'pointer')
      .on('click', (e, d) => setSelectedNode(d))
      .call(
        d3
          .drag()
          .on('start', (e, d) => {
            if (!e.active) sim.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (e, d) => {
            d.fx = e.x;
            d.fy = e.y;
          })
          .on('end', (e, d) => {
            if (!e.active) sim.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      );

    node
      .append('circle')
      .attr('r', 16)
      .attr('fill', nodeColor)
      .attr('fill-opacity', 0.15)
      .attr('stroke', nodeColor)
      .attr('stroke-width', 1.5);

    node
      .append('text')
      .text((d) => d.agent_id?.replace('container_', 'C').replace('constraint_parser', 'Parser') || '?')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('font-size', 9)
      .attr('font-weight', 500)
      .attr('fill', '#1e293b');

    sim.on('tick', () => {
      link
        .attr('x1', (d) => d.source.x)
        .attr('y1', (d) => d.source.y)
        .attr('x2', (d) => d.target.x)
        .attr('y2', (d) => d.target.y);

      edgeLabel
        .attr('x', (d) => (d.source.x + d.target.x) / 2)
        .attr('y', (d) => (d.source.y + d.target.y) / 2 - 6);

      node.attr('transform', (d) => `translate(${d.x},${d.y})`);
    });

    return () => sim.stop();
  }, [data]);

  return (
    <div>
      <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#334155' }}>Causal Chain</h3>
      <div ref={ref} style={{ background: '#f8fafc', borderRadius: 8, border: '0.5px solid #e2e8f0', overflow: 'hidden' }} />
      {selectedNode && (
        <div style={{ marginTop: 8, padding: 12, background: '#f1f5f9', borderRadius: 6, fontSize: 12, border: '0.5px solid #e2e8f0' }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Node Inspector</div>
          <div><strong>Agent:</strong> {selectedNode.agent_id}</div>
          <div><strong>Round:</strong> {selectedNode.round}</div>
          <div>
            <strong>Status:</strong>{' '}
            <span style={{ color: selectedNode.is_failure ? '#ef4444' : '#16a34a', fontWeight: 500 }}>
              {selectedNode.is_failure ? 'Failure detected' : 'Normal execution'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
