import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { GraphNode, GraphLink, NodeCategory } from '../types';
import { CATEGORY_COLORS, CATEGORY_LABELS_VI, CATEGORY_LABELS_EN } from '../data/samples';
import { 
  ZoomIn, ZoomOut, Maximize2, Play, Pause, Search, RotateCcw,
  User, Calendar, MapPin, Lightbulb, Building2, Compass, Layers, Sparkles,
  Link2, Plus, Check, X, ArrowRight, CornerDownRight
} from 'lucide-react';

interface KnowledgeGraphViewProps {
  nodes: GraphNode[];
  links: GraphLink[];
  selectedNodeId?: string;
  onSelectNode: (node: GraphNode | null) => void;
  onExpandNode?: (node: GraphNode) => void;
  onAddLink?: (link: GraphLink) => void;
  isExpandingNode?: boolean;
  graphTitle: string;
  language?: string;
}

export const KnowledgeGraphView: React.FC<KnowledgeGraphViewProps> = ({
  nodes,
  links,
  selectedNodeId,
  onSelectNode,
  onExpandNode,
  onAddLink,
  isExpandingNode,
  graphTitle,
  language = 'vi',
}) => {
  const isEn = language === 'en';
  const categoryLabels = isEn ? CATEGORY_LABELS_EN : CATEGORY_LABELS_VI;
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // States
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [isPhysicsActive, setIsPhysicsActive] = useState<boolean>(true);
  const simulationRef = useRef<d3.Simulation<d3.SimulationNodeDatum, undefined> | null>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const simNodesRef = useRef<GraphNode[]>([]);

  // Connect Mode States (User creating manual links between nodes)
  const [isConnectMode, setIsConnectMode] = useState<boolean>(false);
  const [connectSourceNode, setConnectSourceNode] = useState<GraphNode | null>(null);
  const [targetNodeForLink, setTargetNodeForLink] = useState<GraphNode | null>(null);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState<boolean>(false);
  const [relationInput, setRelationInput] = useState<string>(isEn ? 'related to' : 'liên quan đến');

  const isConnectModeRef = useRef<boolean>(isConnectMode);
  const connectSourceNodeRef = useRef<GraphNode | null>(connectSourceNode);

  useEffect(() => {
    isConnectModeRef.current = isConnectMode;
    connectSourceNodeRef.current = connectSourceNode;
  }, [isConnectMode, connectSourceNode]);

  // Function to unpin all nodes and restart layout
  const handleUnpinAll = () => {
    if (simNodesRef.current && simulationRef.current) {
      simNodesRef.current.forEach(n => {
        n.fx = null;
        n.fy = null;
      });
      simulationRef.current.alpha(0.6).restart();
    }
  };

  // Quick preset relationship tags
  const presetRelations = isEn ? [
    'related to', 'impacts', 'part of', 'influences', 
    'co-founded', 'collaborates with', 'leads to', 'member of'
  ] : [
    'liên quan đến', 'tác động đến', 'thuộc về', 'ảnh hưởng',
    'đồng sáng lập', 'hợp tác với', 'dẫn tới', 'thành viên của'
  ];

  const handleConfirmAddLink = () => {
    if (!connectSourceNode || !targetNodeForLink || !onAddLink) return;

    onAddLink({
      source: connectSourceNode.id,
      target: targetNodeForLink.id,
      relation: relationInput.trim() || (isEn ? 'related to' : 'liên quan đến'),
      strength: 1.2
    });

    setIsLinkModalOpen(false);
    setConnectSourceNode(null);
    setTargetNodeForLink(null);
    setRelationInput(isEn ? 'related to' : 'liên quan đến');
  };

  // Filter nodes & links based on activeCategory and searchTerm
  const filteredData = useMemo(() => {
    let filteredNodes = nodes;
    
    if (activeCategory !== 'all') {
      filteredNodes = filteredNodes.filter(n => n.category === activeCategory);
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      filteredNodes = filteredNodes.filter(n => 
        n.label.toLowerCase().includes(q) || 
        n.summary.toLowerCase().includes(q)
      );
    }

    const validNodeIds = new Set(filteredNodes.map(n => n.id));
    const filteredLinks = links.filter(l => {
      const sourceId = typeof l.source === 'object' ? (l.source as GraphNode).id : l.source;
      const targetId = typeof l.target === 'object' ? (l.target as GraphNode).id : l.target;
      return validNodeIds.has(sourceId as string) && validNodeIds.has(targetId as string);
    });

    return { nodes: filteredNodes, links: filteredLinks };
  }, [nodes, links, activeCategory, searchTerm]);

  // Set up D3 simulation
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth || 900;
    const height = containerRef.current.clientHeight || 600;
    const centerX = width / 2;
    const centerY = height / 2;

    // Identify main root node (importance 10 or first)
    const rootNode = filteredData.nodes.find(n => n.importance === 10) || filteredData.nodes[0];

    // Deep clone data for D3 force simulation with preset structured hierarchy coordinates
    const level1Nodes = filteredData.nodes.filter(n => n.id !== rootNode?.id && (!n.parentId || n.parentId === rootNode?.id));
    const level2Nodes = filteredData.nodes.filter(n => n.id !== rootNode?.id && n.parentId && n.parentId !== rootNode?.id);

    const radius1 = Math.min(width, height) * 0.28;
    const parentSubCounts: Record<string, number> = {};

    const simNodes: GraphNode[] = filteredData.nodes.map((n) => {
      const copy = { ...n };
      
      if (rootNode && copy.id === rootNode.id) {
        copy.x = centerX;
        copy.y = centerY;
      } else if (copy.parentId && copy.parentId !== rootNode?.id) {
        // Child of a sub-node: position around parent
        parentSubCounts[copy.parentId] = (parentSubCounts[copy.parentId] || 0) + 1;
        const subIdx = parentSubCounts[copy.parentId];
        const pIdx = level1Nodes.findIndex(l => l.id === copy.parentId);
        const baseAngle = pIdx >= 0 ? (pIdx / level1Nodes.length) * 2 * Math.PI : 0;
        const offsetAngle = baseAngle + ((subIdx - 2) * 0.45);
        const subRadius = 110;
        
        copy.x = centerX + radius1 * Math.cos(baseAngle) + subRadius * Math.cos(offsetAngle);
        copy.y = centerY + radius1 * Math.sin(baseAngle) + subRadius * Math.sin(offsetAngle);
      } else {
        // Level 1 child around root
        const idx = level1Nodes.findIndex(l => l.id === copy.id);
        const angle = idx >= 0 ? (idx / Math.max(1, level1Nodes.length)) * 2 * Math.PI : Math.random() * 2 * Math.PI;
        copy.x = centerX + radius1 * Math.cos(angle);
        copy.y = centerY + radius1 * Math.sin(angle);
      }
      return copy;
    });

    const simLinks: d3.SimulationLinkDatum<GraphNode>[] = filteredData.links.map(l => ({
      source: typeof l.source === 'object' ? (l.source as GraphNode).id : l.source,
      target: typeof l.target === 'object' ? (l.target as GraphNode).id : l.target,
      relation: l.relation,
      description: l.description,
      strength: l.strength || 1
    }));

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Create container group for zoom
    const g = svg.append('g').attr('class', 'graph-container');

    // Arrow marker definition - Crisp, clean white
    svg.append('defs')
      .append('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 32)
      .attr('refY', 0)
      .attr('markerWidth', 5)
      .attr('markerHeight', 5)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-4L8,0L0,4')
      .attr('fill', '#ffffff')
      .attr('fill-opacity', 0.75);

    simNodesRef.current = simNodes;

    // Helper for uniform, harmonious node sizing across all nodes
    const getNodeRadius = (d: GraphNode) => {
      if (d.importance === 10 || d.id === rootNode?.id) return 32;
      return 28;
    };

    // Orderly Force Simulation with flexible distance and loose link strength
    const simulation = d3.forceSimulation<GraphNode>(simNodes)
      .force('link', d3.forceLink<GraphNode, d3.SimulationLinkDatum<GraphNode>>(simLinks)
        .id(d => d.id)
        .distance(d => {
          const sId = typeof d.source === 'object' ? (d.source as GraphNode).id : d.source;
          const tId = typeof d.target === 'object' ? (d.target as GraphNode).id : d.target;
          if (sId === rootNode?.id || tId === rootNode?.id) return 180;
          return 140;
        })
        .strength(0.15)
      )
      .force('charge', d3.forceManyBody().strength(-280))
      .force('center', d3.forceCenter(centerX, centerY).strength(0.05))
      .force('radial', d3.forceRadial<GraphNode>(
        d => (d.id === rootNode?.id ? 0 : d.parentId === rootNode?.id ? radius1 : radius1 + 110),
        centerX,
        centerY
      ).strength(0.15))
      .force('collision', d3.forceCollide<GraphNode>().radius(d => getNodeRadius(d) + 20));

    simulationRef.current = simulation;

    // Draw Links - Refined, uniform white styling for all links
    const linkGroup = g.append('g').attr('class', 'links');
    const link = linkGroup.selectAll('.link-line')
      .data(simLinks)
      .enter()
      .append('line')
      .attr('class', 'link-line')
      .attr('stroke', '#ffffff')
      .attr('stroke-opacity', 0.45)
      .attr('stroke-width', 1.2)
      .attr('marker-end', 'url(#arrow)');

    // Link Labels (Relationship badges)
    const linkLabelGroup = g.append('g').attr('class', 'link-labels');
    const linkLabel = linkLabelGroup.selectAll('.link-label')
      .data(simLinks)
      .enter()
      .append('g')
      .attr('class', 'link-label');

    linkLabel.append('rect')
      .attr('rx', 4)
      .attr('ry', 4)
      .attr('fill', '#0a0a0b')
      .attr('stroke', '#334155')
      .attr('stroke-width', 1);

    linkLabel.append('text')
      .attr('font-size', '9px')
      .attr('font-weight', '500')
      .attr('fill', '#ffffff')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .text(d => (d as any).relation || '');

    // Draw Nodes
    const nodeGroup = g.append('g').attr('class', 'nodes');
    const node = nodeGroup.selectAll('.node-group')
      .data(simNodes)
      .enter()
      .append('g')
      .attr('class', 'node-group')
      .style('cursor', 'pointer')
      .call(d3.drag<SVGGElement, GraphNode>()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = event.x;
          d.fy = event.y;
        })
      );

    // Node outer circle (ring highlight)
    node.append('circle')
      .attr('class', 'node-ring')
      .attr('r', d => getNodeRadius(d) + 4)
      .attr('fill', 'none')
      .attr('stroke', d => {
        if (connectSourceNode && d.id === connectSourceNode.id) return '#a855f7';
        return CATEGORY_COLORS[d.category]?.dot || '#6366f1';
      })
      .attr('stroke-width', d => {
        if (connectSourceNode && d.id === connectSourceNode.id) return 4;
        if (d.id === selectedNodeId) return 3.5;
        return 0;
      })
      .attr('stroke-opacity', 0.9);

    // Node main circle - Uniform clean radius
    node.append('circle')
      .attr('class', 'node-circle')
      .attr('r', d => getNodeRadius(d))
      .attr('fill', d => CATEGORY_COLORS[d.category]?.dot || '#6366f1');

    // Sub-node indicator badge (double click target)
    node.append('circle')
      .attr('cx', d => getNodeRadius(d) * 0.72)
      .attr('cy', d => -getNodeRadius(d) * 0.72)
      .attr('r', 6.5)
      .attr('fill', '#6366f1')
      .attr('stroke', '#0f172a')
      .attr('stroke-width', 1.5);

    node.append('text')
      .attr('x', d => getNodeRadius(d) * 0.72)
      .attr('y', d => -getNodeRadius(d) * 0.72)
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('fill', '#ffffff')
      .attr('font-size', '9px')
      .attr('font-weight', 'bold')
      .text('+');

    // Node category icon or letter
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('fill', '#ffffff')
      .attr('font-size', '14px')
      .attr('font-weight', '700')
      .text(d => d.label.charAt(0).toUpperCase());

    // Node label below
    node.append('text')
      .attr('class', 'node-label')
      .attr('text-anchor', 'middle')
      .attr('dy', d => getNodeRadius(d) + 16)
      .attr('font-size', '12px')
      .attr('font-weight', '600')
      .attr('fill', '#e2e8f0')
      .text(d => d.label);

    // Double-click vs Single-click handler setup
    let clickTimeout: any = null;

    node.on('click', (event, d) => {
      event.stopPropagation();

      // If in Connect Mode, handle picking source / target nodes
      if (isConnectModeRef.current) {
        if (!connectSourceNodeRef.current) {
          setConnectSourceNode(d);
        } else if (connectSourceNodeRef.current.id === d.id) {
          setConnectSourceNode(null);
        } else {
          setTargetNodeForLink(d);
          setIsLinkModalOpen(true);
        }
        return;
      }

      if (clickTimeout) {
        clearTimeout(clickTimeout);
        clickTimeout = null;
      }
      clickTimeout = setTimeout(() => {
        onSelectNode(d);
        clickTimeout = null;
      }, 220);
    });

    node.on('dblclick', (event, d) => {
      event.stopPropagation();
      if (clickTimeout) {
        clearTimeout(clickTimeout);
        clickTimeout = null;
      }

      // Visual expand ripple animation
      const gNode = d3.select(event.currentTarget);
      const r = getNodeRadius(d);
      gNode.append('circle')
        .attr('r', r + 2)
        .attr('fill', 'none')
        .attr('stroke', '#818cf8')
        .attr('stroke-width', 3)
        .style('opacity', 1)
        .transition()
        .duration(800)
        .attr('r', r + 60)
        .style('opacity', 0)
        .remove();

      if (onExpandNode) {
        onExpandNode(d);
      }
    });

    node.on('mouseover', (event, d) => {
      setHoveredNodeId(d.id);
    });

    node.on('mouseout', () => {
      setHoveredNodeId(null);
    });

    svg.on('click', () => {
      if (!isConnectModeRef.current) {
        onSelectNode(null);
      }
    });

    // Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    zoomBehaviorRef.current = zoom;
    svg.call(zoom);

    // Simulation tick handler
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as GraphNode).x!)
        .attr('y1', d => (d.source as GraphNode).y!)
        .attr('x2', d => (d.target as GraphNode).x!)
        .attr('y2', d => (d.target as GraphNode).y!);

      linkLabel.attr('transform', d => {
        const sx = (d.source as GraphNode).x!;
        const sy = (d.source as GraphNode).y!;
        const tx = (d.target as GraphNode).x!;
        const ty = (d.target as GraphNode).y!;
        const mx = (sx + tx) / 2;
        const my = (sy + ty) / 2;
        return `translate(${mx}, ${my})`;
      });

      // Adjust link label background rect sizing
      linkLabel.selectAll('text').each(function () {
        const bbox = (this as SVGTextElement).getBBox();
        const parent = d3.select((this as SVGTextElement).parentNode as SVGGElement);
        parent.select('rect')
          .attr('x', bbox.x - 4)
          .attr('y', bbox.y - 2)
          .attr('width', bbox.width + 8)
          .attr('height', bbox.height + 4);
      });

      node.attr('transform', d => `translate(${d.x}, ${d.y})`);
    });

    return () => {
      simulation.stop();
      if (clickTimeout) clearTimeout(clickTimeout);
    };
  }, [filteredData, selectedNodeId, connectSourceNode]);

  // Update node highlight state based on hoveredNodeId or selectedNodeId
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);

    const activeId = hoveredNodeId || selectedNodeId || connectSourceNode?.id;

    if (!activeId) {
      svg.selectAll('.node-group').style('opacity', 1);
      svg.selectAll('.link-line')
        .style('stroke', '#ffffff')
        .style('stroke-opacity', 0.45)
        .style('stroke-width', 1.2);
      svg.selectAll('.link-label').style('opacity', 1);
      return;
    }

    // Find connected node IDs
    const connectedNodeIds = new Set<string>([activeId]);
    filteredData.links.forEach(l => {
      const s = typeof l.source === 'object' ? (l.source as GraphNode).id : l.source;
      const t = typeof l.target === 'object' ? (l.target as GraphNode).id : l.target;
      if (s === activeId) connectedNodeIds.add(t as string);
      if (t === activeId) connectedNodeIds.add(s as string);
    });

    svg.selectAll('.node-group').style('opacity', d => 
      connectedNodeIds.has((d as GraphNode).id) ? 1 : 0.2
    );

    svg.selectAll('.link-line')
      .style('stroke', '#ffffff')
      .style('stroke-opacity', d => {
        const s = typeof (d as any).source === 'object' ? (d as any).source.id : (d as any).source;
        const t = typeof (d as any).target === 'object' ? (d as any).target.id : (d as any).target;
        return (s === activeId || t === activeId) ? 0.95 : 0.12;
      })
      .style('stroke-width', d => {
        const s = typeof (d as any).source === 'object' ? (d as any).source.id : (d as any).source;
        const t = typeof (d as any).target === 'object' ? (d as any).target.id : (d as any).target;
        return (s === activeId || t === activeId) ? 1.6 : 1.0;
      });

    svg.selectAll('.link-label').style('opacity', d => {
      const s = typeof (d as any).source === 'object' ? (d as any).source.id : (d as any).source;
      const t = typeof (d as any).target === 'object' ? (d as any).target.id : (d as any).target;
      return (s === activeId || t === activeId) ? 1 : 0.1;
    });

  }, [hoveredNodeId, selectedNodeId, connectSourceNode, filteredData]);

  // Zoom controls
  const handleZoomIn = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      d3.select(svgRef.current).transition().duration(300).call(zoomBehaviorRef.current.scaleBy, 1.3);
    }
  };

  const handleZoomOut = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      d3.select(svgRef.current).transition().duration(300).call(zoomBehaviorRef.current.scaleBy, 0.7);
    }
  };

  const handleResetZoom = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      d3.select(svgRef.current).transition().duration(400).call(
        zoomBehaviorRef.current.transform,
        d3.zoomIdentity
      );
    }
  };

  const togglePhysics = () => {
    if (!simulationRef.current) return;
    if (isPhysicsActive) {
      simulationRef.current.stop();
    } else {
      simulationRef.current.restart();
    }
    setIsPhysicsActive(!isPhysicsActive);
  };

  return (
    <div className="relative w-full h-[calc(100vh-80px)] min-h-[550px] bg-[#050505] bg-radial-grid rounded-2xl overflow-hidden border border-[#1f2937] shadow-2xl flex flex-col">
      
      {/* Top Overlay Bar: Title, Category Pills, Connect Mode & Search */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        
        {/* Title Badge */}
        <div className="pointer-events-auto bg-[#0a0a0b]/90 backdrop-blur-md border border-[#1f2937] rounded-xl px-4 py-2 flex items-center gap-2.5 shadow-xl">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-sm font-serif-title font-medium text-white tracking-wide">
            {graphTitle}
          </span>
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#111827] text-[#6366f1] border border-[#1f2937]">
            NODES: {filteredData.nodes.length} | LINKS: {filteredData.links.length}
          </span>
        </div>

        {/* Action Controls: Category Filters & Connect Link Mode Toggle */}
        <div className="pointer-events-auto flex items-center gap-2 flex-wrap">
          {/* Category Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-full p-1 bg-[#0a0a0b]/90 backdrop-blur-md border border-[#1f2937] rounded-xl shadow-xl">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                activeCategory === 'all'
                  ? 'bg-[#6366f1] text-white shadow-sm'
                  : 'text-[#9ca3af] hover:text-white hover:bg-[#111827]'
              }`}
            >
              {isEn ? 'All' : 'Tất cả'} ({nodes.length})
            </button>
            {Object.keys(categoryLabels).map(catKey => {
              const count = nodes.filter(n => n.category === catKey).length;
              if (count === 0) return null;
              return (
                <button
                  key={catKey}
                  onClick={() => setActiveCategory(catKey)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeCategory === catKey
                      ? 'bg-[#111827] text-white border border-[#374151] shadow-sm'
                      : 'text-[#9ca3af] hover:text-white hover:bg-[#111827]'
                  }`}
                >
                  <span 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: CATEGORY_COLORS[catKey]?.dot || '#6366f1' }}
                  />
                  <span>{categoryLabels[catKey]}</span>
                  <span className="text-[10px] opacity-70">({count})</span>
                </button>
              );
            })}
          </div>

          {/* Connect Nodes Tool Button */}
          <button
            onClick={() => {
              setIsConnectMode(!isConnectMode);
              setConnectSourceNode(null);
            }}
            className={`px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow-xl cursor-pointer ${
              isConnectMode
                ? 'bg-purple-600 text-white ring-2 ring-purple-400 ring-offset-2 ring-offset-[#050505]'
                : 'bg-[#0a0a0b]/90 backdrop-blur-md text-[#d1d5db] hover:text-white hover:bg-[#1f2937] border border-[#1f2937]'
            }`}
            title={isEn ? "Toggle connect nodes mode to create custom links" : "Bật/Tắt chế độ tạo liên kết giữa 2 node"}
          >
            <Link2 className={`w-3.5 h-3.5 ${isConnectMode ? 'animate-bounce' : 'text-purple-400'}`} />
            <span>{isEn ? 'Connect Nodes' : 'Nối Node'}</span>
          </button>
        </div>

        {/* Search inside Graph */}
        <div className="pointer-events-auto relative">
          <Search className="w-4 h-4 text-[#4b5563] absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={isEn ? "Filter nodes..." : "Lọc node..."}
            className="w-36 sm:w-48 pl-9 pr-3 py-1.5 text-xs bg-[#0a0a0b]/90 backdrop-blur-md text-white placeholder-[#4b5563] rounded-xl border border-[#1f2937] focus:outline-none focus:border-[#6366f1] shadow-xl"
          />
        </div>

      </div>

      {/* Connect Mode Active Banner */}
      {isConnectMode && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 bg-purple-950/90 backdrop-blur-md border border-purple-500/50 rounded-xl px-5 py-2.5 shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="w-2 h-2 rounded-full bg-purple-400 animate-ping shrink-0" />
          <div className="text-xs text-purple-100 font-medium">
            {!connectSourceNode ? (
              <span>{isEn ? '👉 Step 1: Click the 1st node (Source)' : '👉 Bước 1: Nhấp chọn Node nguồn (Node 1)'}</span>
            ) : (
              <span className="flex items-center gap-1.5">
                <span>{isEn ? 'Selected' : 'Đã chọn'}</span>
                <strong className="text-white bg-purple-900/60 px-2 py-0.5 rounded border border-purple-400/40">{connectSourceNode.label}</strong>
                <span>{isEn ? '➔ Step 2: Click the 2nd node to connect' : '➔ Bước 2: Nhấp chọn Node đích (Node 2) để nối'}</span>
              </span>
            )}
          </div>
          <button
            onClick={() => {
              setIsConnectMode(false);
              setConnectSourceNode(null);
            }}
            className="p-1 hover:bg-purple-900/50 text-purple-300 hover:text-white rounded-lg transition-colors cursor-pointer ml-2"
            title={isEn ? "Exit connect mode" : "Thoát chế độ nối"}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Floating View Controls (Zoom, Fit, Physics) */}
      <div className="absolute bottom-6 right-6 z-20 flex flex-col gap-2 bg-[#0a0a0b]/90 backdrop-blur-md p-1.5 rounded-xl border border-[#1f2937] shadow-2xl">
        <button
          onClick={handleZoomIn}
          className="p-2 text-[#9ca3af] hover:text-white hover:bg-[#111827] rounded-lg transition-colors cursor-pointer"
          title={isEn ? "Zoom in" : "Phóng to"}
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-2 text-[#9ca3af] hover:text-white hover:bg-[#111827] rounded-lg transition-colors cursor-pointer"
          title={isEn ? "Zoom out" : "Thu nhỏ"}
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleResetZoom}
          className="p-2 text-[#9ca3af] hover:text-white hover:bg-[#111827] rounded-lg transition-colors cursor-pointer"
          title={isEn ? "Center view" : "Về trung tâm"}
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <button
          onClick={handleUnpinAll}
          className="p-2 text-[#9ca3af] hover:text-white hover:bg-[#111827] rounded-lg transition-colors cursor-pointer"
          title={isEn ? "Rearrange positions" : "Tự động sắp xếp lại vị trí"}
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <div className="w-full h-px bg-[#1f2937] my-0.5" />
        <button
          onClick={togglePhysics}
          className={`p-2 rounded-lg transition-colors cursor-pointer ${
            isPhysicsActive 
              ? 'text-[#6366f1] bg-[#6366f1]/10 hover:bg-[#6366f1]/20' 
              : 'text-[#9ca3af] hover:text-white hover:bg-[#111827]'
          }`}
          title={isPhysicsActive ? (isEn ? "Pause layout physics" : "Tạm dừng vật lý") : (isEn ? "Run layout physics" : "Chạy vật lý")}
        >
          {isPhysicsActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>
      </div>

      {/* Main SVG Graph Container */}
      <div 
        ref={containerRef} 
        className={`w-full h-full flex-1 ${isConnectMode ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'}`}
      >
        <svg
          ref={svgRef}
          className="w-full h-full"
          style={{ minHeight: '100%' }}
        />
      </div>

      {/* Bottom Left Legend & Double-click Hint Bar */}
      <div className="absolute bottom-6 left-6 z-20 flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-[#0a0a0b]/90 backdrop-blur-md border border-[#1f2937] rounded-xl px-4 py-2.5 text-[11px] text-[#9ca3af] shadow-2xl">
        <div className="flex items-center gap-2 text-indigo-400 font-medium">
          <Sparkles className="w-4 h-4 shrink-0 animate-pulse" />
          <span>{isEn ? 'Drag nodes freely | Double-click: AI expands sub-nodes | "Connect Nodes": link any 2 nodes' : 'Kéo thả node tùy ý | Nhấp đúp: AI bung node con (+) | "Nối Node": tự do tạo liên kết giữa 2 node'}</span>
        </div>

        {isExpandingNode && (
          <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-indigo-500/20 text-indigo-300 font-medium text-xs animate-pulse border border-indigo-500/30">
            <Sparkles className="w-3.5 h-3.5 animate-spin" />
            <span>{isEn ? 'AI expanding sub-nodes...' : 'AI đang bung node con...'}</span>
          </div>
        )}
      </div>

      {/* Create Link Modal */}
      {isLinkModalOpen && connectSourceNode && targetNodeForLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#111827] border border-[#374151] rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            
            <div className="flex items-center justify-between border-b border-[#1f2937] pb-3">
              <div className="flex items-center gap-2">
                <Link2 className="w-5 h-5 text-purple-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                  {isEn ? 'Create Relationship Link' : 'Tạo Liên Kết Mới'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsLinkModalOpen(false);
                  setTargetNodeForLink(null);
                }}
                className="p-1 text-[#9ca3af] hover:text-white rounded-lg hover:bg-[#1f2937] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Source & Target Display */}
            <div className="p-3 bg-[#0a0a0b] rounded-xl border border-[#1f2937] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span 
                  className="w-3 h-3 rounded-full shrink-0" 
                  style={{ backgroundColor: CATEGORY_COLORS[connectSourceNode.category]?.dot || '#6366f1' }}
                />
                <span className="text-xs font-bold text-white truncate">{connectSourceNode.label}</span>
              </div>

              <div className="p-1.5 rounded-full bg-[#1f2937] text-purple-400 shrink-0">
                <ArrowRight className="w-4 h-4" />
              </div>

              <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
                <span className="text-xs font-bold text-white truncate">{targetNodeForLink.label}</span>
                <span 
                  className="w-3 h-3 rounded-full shrink-0" 
                  style={{ backgroundColor: CATEGORY_COLORS[targetNodeForLink.category]?.dot || '#6366f1' }}
                />
              </div>
            </div>

            {/* Relation Label Input */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#9ca3af]">
                {isEn ? 'Relationship name / label:' : 'Tên mối quan hệ (nhãn liên kết):'}
              </label>
              <input
                type="text"
                value={relationInput}
                onChange={(e) => setRelationInput(e.target.value)}
                placeholder={isEn ? "e.g. impacts, related to..." : "Ví dụ: tác động đến, đồng sáng lập, thuộc về..."}
                className="w-full px-3.5 py-2 text-xs bg-[#0a0a0b] text-white rounded-xl border border-[#374151] focus:outline-none focus:border-purple-500 transition-colors"
                autoFocus
              />
            </div>

            {/* Preset Suggestions */}
            <div className="space-y-1.5">
              <span className="text-[11px] text-[#9ca3af]">
                {isEn ? 'Quick presets:' : 'Gợi ý nhanh:'}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {presetRelations.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setRelationInput(preset)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] transition-all cursor-pointer ${
                      relationInput === preset
                        ? 'bg-purple-600 text-white font-semibold shadow-xs'
                        : 'bg-[#0a0a0b] text-[#9ca3af] hover:text-white border border-[#1f2937] hover:border-[#374151]'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-[#1f2937] flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setIsLinkModalOpen(false);
                  setTargetNodeForLink(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-[#9ca3af] hover:text-white rounded-xl hover:bg-[#1f2937] transition-colors cursor-pointer"
              >
                {isEn ? 'Cancel' : 'Hủy'}
              </button>
              <button
                type="button"
                onClick={handleConfirmAddLink}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl flex items-center gap-1.5 shadow-lg shadow-purple-900/30 transition-all cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isEn ? 'Create Link' : 'Tạo liên kết'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
