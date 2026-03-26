import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import {
  Background,
  BaseEdge,
  Controls,
  EdgeLabelRenderer,
  getNodesBounds,
  getSmoothStepPath,
  getViewportForBounds,
  Handle,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  Position,
  useEdgesState,
  useNodesState
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

function kindOf(value) {
  if (Array.isArray(value)) {
    return 'array';
  }
  if (value === null) {
    return 'null';
  }
  return typeof value;
}

function summarizeValue(value) {
  if (Array.isArray(value)) {
    return `[${value.length} items]`;
  }
  if (value === null) {
    return 'null';
  }
  if (typeof value === 'object') {
    return `{${Object.keys(value).length} keys}`;
  }
  if (typeof value === 'string') {
    return value;
  }
  return String(value);
}

function formatFieldValue(value) {
  if (value === null) {
    return 'null';
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  if (typeof value === 'string') {
    return value;
  }

  return String(value);
}

function JsonNode({ data }) {
  return (
    <div className={`flow-card ${data.kind}`}>
      <Handle type="target" position={Position.Left} className="flow-card__handle flow-card__handle--left" />

      <div className="flow-card__header">
        <span className="flow-card__label">{data.label}</span>
      </div>

      <div className="flow-card__rows">
        {data.rows.map((row) => (
          <div key={row.key} className="flow-card__row">
            <span className="flow-card__row-key">{row.key}: </span>
            <span className={`flow-card__row-value ${row.kind}`}>{row.value}</span>
          </div>
        ))}
      </div>

      <Handle type="source" position={Position.Right} className="flow-card__handle flow-card__handle--right" />
    </div>
  );
}

function LabeledEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data }) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 16
  });

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={{ stroke: '#7aa2f7', strokeOpacity: 0.82, strokeWidth: 2 }} />
      <EdgeLabelRenderer>
        <div
          className="flow-edge-label"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`
          }}
        >
          {data?.label}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

const nodeTypes = { jsonNode: memo(JsonNode) };
const edgeTypes = { labeled: LabeledEdge };

function hashString(value) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash) + value.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash).toString(36);
}

function getStorageKey(data) {
  return `json-fixer-graph-${hashString(JSON.stringify(data))}`;
}

function loadSavedPositions(storageKey) {
  try {
    return JSON.parse(window.localStorage.getItem(storageKey) || '{}');
  } catch (error) {
    return {};
  }
}

function mergeSavedPositions(nodes, savedPositions) {
  return nodes.map((node) => {
    const saved = savedPositions[node.id];

    if (!saved) {
      return node;
    }

    return {
      ...node,
      position: saved
    };
  });
}

function buildNodeRows(value) {
  const entries = Array.isArray(value)
    ? value.map((item, index) => [String(index), item])
    : Object.entries(value);

  return entries.map(([key, entryValue]) => {
    if (entryValue !== null && typeof entryValue === 'object') {
      return {
        key,
        value: summarizeValue(entryValue),
        kind: kindOf(entryValue)
      };
    }

    return {
      key,
      value: formatFieldValue(entryValue),
      kind: kindOf(entryValue)
    };
  });
}

function buildFlowGraph(data) {
  const nodes = [];
  const edges = [];
  let nodeIndex = 0;
  const NODE_WIDTH = 340;
  const X_GAP = 170;
  const Y_GAP = 72;

  function nextId() {
    nodeIndex += 1;
    return `node-${nodeIndex}`;
  }

  function estimateNodeHeight(rowsCount) {
    return Math.max(96, 62 + (rowsCount * 24));
  }

  function createEdge(source, target, label) {
    edges.push({
      id: `${source}-${target}-${label}`,
      source,
      target,
      type: 'labeled',
      data: { label }
    });
  }

  function visitObject(value, label, depth, top, parentId = null, edgeLabel = null) {
    const id = nextId();
    const rows = buildNodeRows(value);
    const nodeHeight = estimateNodeHeight(rows.length);
    const nestedEntries = (Array.isArray(value) ? value.map((item, index) => [String(index), item]) : Object.entries(value))
      .filter(([, entryValue]) => entryValue !== null && typeof entryValue === 'object');

    const childItems = [];

    nestedEntries.forEach(([key, childValue]) => {
      if (Array.isArray(childValue)) {
        const objectItems = childValue.filter((item) => item !== null && typeof item === 'object');

        if (objectItems.length > 0) {
          objectItems.forEach((item) => {
            childItems.push({ label: key, value: item, edgeLabel: key });
          });
        }
      } else {
        childItems.push({ label: key, value: childValue, edgeLabel: key });
      }
    });

    const childLayouts = [];
    let childrenTop = top;

    childItems.forEach((childItem) => {
      const childLayout = visitObject(childItem.value, childItem.label, depth + 1, childrenTop, id, childItem.edgeLabel);
      childLayouts.push(childLayout);
      childrenTop += childLayout.subtreeHeight + Y_GAP;
    });

    const childrenHeight = childLayouts.length
      ? childLayouts.reduce((sum, layout) => sum + layout.subtreeHeight, 0) + (Y_GAP * (childLayouts.length - 1))
      : 0;

    const subtreeHeight = Math.max(nodeHeight, childrenHeight);
    const centerY = top + (subtreeHeight / 2);
    const nodeY = centerY - (nodeHeight / 2);

    nodes.push({
      id,
      type: 'jsonNode',
      position: { x: depth * (NODE_WIDTH + X_GAP), y: nodeY },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      data: {
        label,
        kind: Array.isArray(value) ? 'array' : 'object',
        rows
      }
    });

    if (parentId && edgeLabel) {
      createEdge(parentId, id, edgeLabel);
    }

    return {
      id,
      subtreeHeight,
      centerY
    };
  }

  visitObject(data, 'root', 0, 0);
  return { nodes, edges };
}

export default function JsonGraph({ data, onExportingChange = () => {} }) {
  const legendText = 'https://furthurr.github.io/fixJson desarrollado por Pedro GV @furthurr';
  const exportRef = useRef(null);
  const storageKey = useMemo(() => getStorageKey(data), [data]);
  const graph = useMemo(() => buildFlowGraph(data), [data]);
  const [nodes, setNodes, onNodesChange] = useNodesState(graph.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(graph.edges);
  const [isExporting, setIsExporting] = useState(false);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const [exportSize, setExportSize] = useState(null);

  useEffect(() => {
    const savedPositions = loadSavedPositions(storageKey);
    setNodes(mergeSavedPositions(graph.nodes, savedPositions));
    setEdges(graph.edges);
  }, [graph, setEdges, setNodes, storageKey]);

  useEffect(() => {
    const positions = nodes.reduce((accumulator, node) => {
      accumulator[node.id] = node.position;
      return accumulator;
    }, {});

    window.localStorage.setItem(storageKey, JSON.stringify(positions));
  }, [nodes, storageKey]);

  async function handleDownloadPng() {
    if (!exportRef.current || isExporting) {
      return;
    }

    let previousViewport = null;

    try {
      setIsExporting(true);
      onExportingChange(true);
      previousViewport = reactFlowInstance?.getViewport?.() ?? null;

      if (reactFlowInstance) {
        const bounds = getNodesBounds(nodes);
        const padding = 120;
        const width = Math.max(1400, Math.ceil(bounds.width + (padding * 2)));
        const height = Math.max(900, Math.ceil(bounds.height + (padding * 2)));
        const viewport = getViewportForBounds(bounds, width, height, 0.05, 2, 0.08);

        setExportSize({ width, height });
        await new Promise((resolve) => window.requestAnimationFrame(() => resolve()));
        await reactFlowInstance.setViewport(viewport, { duration: 0 });
      }

      await new Promise((resolve) => window.requestAnimationFrame(() => resolve()));
      await new Promise((resolve) => window.requestAnimationFrame(() => resolve()));

      const rect = exportRef.current.getBoundingClientRect();
      const nodeCount = nodes.length;
      const area = rect.width * rect.height;
      let pixelRatio = Math.max(window.devicePixelRatio || 1, 2.2);

      if (nodeCount <= 12 && area < 1_000_000) {
        pixelRatio = Math.max(pixelRatio, 2.6);
      } else if (nodeCount <= 30 && area < 2_000_000) {
        pixelRatio = Math.max(pixelRatio, 2.9);
      } else if (nodeCount <= 60 && area < 4_000_000) {
        pixelRatio = Math.max(pixelRatio, 3.2);
      } else {
        pixelRatio = Math.max(pixelRatio, 3.5);
      }

      const dataUrl = await toPng(exportRef.current, {
        cacheBust: true,
        pixelRatio,
        backgroundColor: '#101827',
        canvasWidth: rect.width * pixelRatio,
        canvasHeight: rect.height * pixelRatio,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left'
        }
      });

      const link = document.createElement('a');
      link.download = 'fixjson-grafica.png';
      link.href = dataUrl;
      link.click();
    } finally {
      if (reactFlowInstance && previousViewport) {
        await reactFlowInstance.setViewport(previousViewport, { duration: 0 });
      }
      setExportSize(null);
      setIsExporting(false);
      onExportingChange(false);
    }
  }

  const legendFontSize = useMemo(() => {
    const width = exportSize?.width ?? 1400;
    const estimatedCharacterWidth = 0.56;
    const targetWidth = width * 0.4;
    const size = targetWidth / (legendText.length * estimatedCharacterWidth);

    return Math.max(9, Math.min(20, size));
  }, [exportSize, legendText]);

  return (
    <div className="panel panel--graph">
      <div className="graph-help">
        <span>Arrastra nodos, usa zoom y explora la estructura.</span>
        <div className="graph-help__actions">
          <span>{nodes.length} nodos</span>
          <button type="button" className="secondary-button graph-download-button" onClick={handleDownloadPng}>
            {isExporting ? 'Generando PNG...' : 'Descargar PNG'}
          </button>
        </div>
      </div>

      <div ref={exportRef} className={`graph-export-surface ${isExporting ? 'is-exporting' : ''}`}>
        <div
          className="graph-stage"
          style={exportSize ? { width: `${exportSize.width}px`, height: `${exportSize.height}px` } : undefined}
        >
        <ReactFlowProvider>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            nodesDraggable
            nodesConnectable={false}
            elementsSelectable
            panOnDrag
            minZoom={0.2}
            maxZoom={1.6}
            proOptions={{ hideAttribution: true }}
            onInit={setReactFlowInstance}
          >
            {!isExporting && <Background color="#24324d" gap={24} size={1} />}
            <MiniMap
              pannable
              zoomable
              nodeStrokeColor="#7aa2f7"
              nodeColor="#182235"
              maskColor="rgba(10, 12, 20, 0.45)"
            />
            <Controls />
          </ReactFlow>
        </ReactFlowProvider>
        </div>

        <div className="graph-export-legend" style={{ fontSize: `${legendFontSize}px` }}>
          {legendText}
        </div>
      </div>
    </div>
  );
}
