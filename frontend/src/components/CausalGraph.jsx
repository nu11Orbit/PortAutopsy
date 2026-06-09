import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import mockGraph from '../mock/causal_graph.json';

export default function CausalGraph({ data = mockGraph }) {
  const ref = useRef();

  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    el.innerHTML = '';
    const W = 500, H = 300;
    const svg = d3.select(el).append('svg').attr('width', W).attr('height', H);

    const nodeColor = (d) => (d.is_failure ? '#ef4444' : '#60a5fa');

    // Deep-copy nodes/edges so D3 can mutate them freely
    const nodes = data.nodes.map((n) => ({ ...n }));
    const edges = data.edges.map((e) => ({ ...e }));

    const sim = d3
      .forceSimulation(nodes)
      .force('link', d3.forceLink(edges).id((d) => d.id).distance(80))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(W / 2, H / 2));

    const link = svg
      .append('g')
      .selectAll('line')
      .data(edges)
      .join('line')
      .attr('stroke', '#94a3b8')
      .attr('stroke-width', 1)
      .attr('marker-end', 'url(#arrow)');

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

    const node = svg
      .append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('cursor', 'pointer')
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
      .attr('r', 14)
      .attr('fill', nodeColor)
      .attr('fill-opacity', 0.15)
      .attr('stroke', nodeColor)
      .attr('stroke-width', 1.5);
    node
      .append('text')
      .text((d) => d.agent_id?.replace('container_', 'C') || '?')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('font-size', 9)
      .attr('fill', '#1e293b');

    sim.on('tick', () => {
      link
        .attr('x1', (d) => d.source.x)
        .attr('y1', (d) => d.source.y)
        .attr('x2', (d) => d.target.x)
        .attr('y2', (d) => d.target.y);
      node.attr('transform', (d) => `translate(${d.x},${d.y})`);
    });

    return () => sim.stop();
  }, [data]);

  return (
    <div>
      <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Causal Graph</h2>
      <div ref={ref} />
    </div>
  );
}
