import { useCallback, useRef, useEffect } from 'react'
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Node,
  Edge,
  Connection,
  NodeTypes,
  MarkerType,
  Handle,
  Position,
  NodeProps,
} from 'reactflow'
import 'reactflow/dist/style.css'
import {
  FileCode2, FileJson, Settings2, Database, Lock,
  FileText, Layers, Package,
} from 'lucide-react'

/* ── Types ─────────────────────────────────────────── */
export type NodeCategory = 'entry' | 'module' | 'config' | 'database' | 'auth' | 'util' | 'test'
export type Complexity   = 'Low' | 'Medium' | 'High'
export type Language     = 'TypeScript' | 'JavaScript' | 'JSON' | 'Python' | 'CSS' | 'Other'

export interface GraphNodeData {
  id:         string
  label:      string
  category:   NodeCategory
  language:   Language
  complexity: Complexity
  size:       string
  imports:    string[]
  importedBy: string[]
  lines?:     number
  folder?:    string
}

export interface GraphEdgeData {
  kind?: 'import' | 'call' | 'type'
}

/* ── Category → visual config ────────────────────── */
const CATEGORY_CONFIG: Record<NodeCategory, { icon: React.ComponentType<{ size: number; strokeWidth: number }>; bg: string; border: string; badge: string }> = {
  entry:    { icon: Layers,     bg: '#1A1A1A', border: '#1A1A1A', badge: '#FFCC00' },
  module:   { icon: FileCode2,  bg: '#FFFFFF', border: '#1A1A1A', badge: '#BFCFFF' },
  config:   { icon: Settings2,  bg: '#FFFFFF', border: '#1A1A1A', badge: '#E8E4DC' },
  database: { icon: Database,   bg: '#FFFFFF', border: '#0055FF', badge: '#BFCFFF' },
  auth:     { icon: Lock,       bg: '#FFFFFF', border: '#C29F60', badge: '#F5F0E8' },
  util:     { icon: FileText,   bg: '#FFFFFF', border: '#1A1A1A', badge: '#E8E4DC' },
  test:     { icon: Package,    bg: '#FFFFFF', border: '#E63B2E', badge: '#FFCFCC' },
}

const COMPLEXITY_COLORS: Record<Complexity, string> = {
  Low:    '#16A34A',
  Medium: '#C29F60',
  High:   '#E63B2E',
}

const LANGUAGE_ICONS: Record<Language, React.ComponentType<{ size: number; strokeWidth: number }>> = {
  TypeScript:  FileCode2,
  JavaScript:  FileCode2,
  JSON:        FileJson,
  Python:      FileCode2,
  CSS:         FileText,
  Other:       FileText,
}

/* ── Custom Node Component ───────────────────────── */
function FileNode({ data, selected }: NodeProps<GraphNodeData>) {
  const cfg       = CATEGORY_CONFIG[data.category]
  const Icon      = cfg.icon
  const LangIcon  = LANGUAGE_ICONS[data.language]
  const isEntry   = data.category === 'entry'

  return (
    <div
      style={{
        background:   isEntry ? '#1A1A1A' : '#FFFFFF',
        border:       `2px solid ${selected ? '#FFCC00' : cfg.border}`,
        boxShadow:    selected
          ? '4px 4px 0 #FFCC00'
          : isEntry
            ? '4px 4px 0 #FFCC00'
            : '3px 3px 0 #1A1A1A',
        minWidth:  120,
        maxWidth:  160,
        cursor:    'pointer',
        transition: 'box-shadow 0.12s, border-color 0.12s',
        fontFamily: "'JetBrains Mono', monospace",
      }}
    >
      <Handle type="target" position={Position.Top}    style={{ background: '#1A1A1A', width: 8, height: 8, border: '2px solid #1A1A1A' }} />
      <Handle type="source" position={Position.Bottom} style={{ background: '#1A1A1A', width: 8, height: 8, border: '2px solid #1A1A1A' }} />

      {/* Category badge strip */}
      <div style={{ background: cfg.badge, borderBottom: '1px solid rgba(0,0,0,0.15)', padding: '3px 10px' }}>
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#1A1A1A' }}>
          {data.category}
        </span>
      </div>

      {/* Body */}
      <div style={{ padding: '10px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <Icon size={18} strokeWidth={1.8} color={isEntry ? '#FFCC00' : '#1A1A1A'} />
          <span style={{ fontSize: 11, fontWeight: 700, color: isEntry ? '#FFFFFF' : '#1A1A1A', wordBreak: 'break-all', lineHeight: 1.3 }}>
            {data.label}
          </span>
        </div>

        {/* Meta row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <LangIcon size={10} strokeWidth={2} color={isEntry ? '#999' : '#747878'} />
            <span style={{ fontSize: 9, color: isEntry ? '#999' : '#747878', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {data.language}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: COMPLEXITY_COLORS[data.complexity] }} />
            <span style={{ fontSize: 9, color: isEntry ? '#aaa' : '#747878' }}>{data.complexity}</span>
          </div>
        </div>

        {/* Size */}
        <div style={{ marginTop: 6, borderTop: `1px solid ${isEntry ? '#333' : '#DAD6CE'}`, paddingTop: 6 }}>
          <span style={{ fontSize: 9, color: isEntry ? '#888' : '#747878' }}>{data.size}</span>
          {data.lines && (
            <span style={{ fontSize: 9, color: isEntry ? '#666' : '#ADADAD', marginLeft: 8 }}>
              {data.lines} lines
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

const NODE_TYPES: NodeTypes = { file: FileNode }

/* ── Default graph data ─────────────────────────── */
export const DEFAULT_GRAPH_NODES: Node<GraphNodeData>[] = [
  {
    id: 'main', type: 'file', position: { x: 320, y: 40 },
    data: { id: 'main', label: 'main.ts', category: 'entry', language: 'TypeScript', complexity: 'Low', size: '2.4 KB', lines: 72, folder: 'src', imports: ['api.ts', 'config.json'], importedBy: [] },
  },
  {
    id: 'api', type: 'file', position: { x: 180, y: 220 },
    data: { id: 'api', label: 'api.ts', category: 'module', language: 'TypeScript', complexity: 'High', size: '24 KB', lines: 580, folder: 'src', imports: ['config.json', 'auth.ts', 'db_pool.ts'], importedBy: ['main.ts'] },
  },
  {
    id: 'config', type: 'file', position: { x: 560, y: 200 },
    data: { id: 'config', label: 'config.json', category: 'config', language: 'JSON', complexity: 'Low', size: '1.2 KB', lines: 38, folder: 'src', imports: [], importedBy: ['api.ts', 'main.ts'] },
  },
  {
    id: 'auth', type: 'file', position: { x: 60, y: 420 },
    data: { id: 'auth', label: 'auth.ts', category: 'auth', language: 'TypeScript', complexity: 'Medium', size: '8.7 KB', lines: 210, folder: 'src/middleware', imports: ['db_pool.ts'], importedBy: ['api.ts'] },
  },
  {
    id: 'db_pool', type: 'file', position: { x: 360, y: 420 },
    data: { id: 'db_pool', label: 'db_pool.ts', category: 'database', language: 'TypeScript', complexity: 'Medium', size: '5.1 KB', lines: 130, folder: 'src/db', imports: [], importedBy: ['api.ts', 'auth.ts'] },
  },
  {
    id: 'utils', type: 'file', position: { x: 600, y: 420 },
    data: { id: 'utils', label: 'utils.ts', category: 'util', language: 'TypeScript', complexity: 'Low', size: '3.3 KB', lines: 88, folder: 'src/lib', imports: [], importedBy: ['api.ts'] },
  },
  {
    id: 'routes', type: 'file', position: { x: 180, y: 620 },
    data: { id: 'routes', label: 'routes.ts', category: 'module', language: 'TypeScript', complexity: 'High', size: '18 KB', lines: 420, folder: 'src', imports: ['auth.ts', 'db_pool.ts', 'utils.ts'], importedBy: ['api.ts'] },
  },
  {
    id: 'schema', type: 'file', position: { x: 460, y: 620 },
    data: { id: 'schema', label: 'schema.ts', category: 'module', language: 'TypeScript', complexity: 'Medium', size: '6.8 KB', lines: 156, folder: 'src/db', imports: [], importedBy: ['db_pool.ts', 'routes.ts'] },
  },
  {
    id: 'tests', type: 'file', position: { x: 700, y: 220 },
    data: { id: 'tests', label: 'api.test.ts', category: 'test', language: 'TypeScript', complexity: 'Medium', size: '12 KB', lines: 290, folder: 'tests', imports: ['api.ts', 'config.json'], importedBy: [] },
  },
]

export const DEFAULT_GRAPH_EDGES: Edge[] = [
  { id: 'e-main-api',     source: 'main',   target: 'api',     type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14, color: '#1A1A1A' }, style: { stroke: '#1A1A1A', strokeWidth: 2 }, label: 'import', labelStyle: { fontSize: 9, fontFamily: 'JetBrains Mono', fill: '#747878' }, labelBgStyle: { fill: '#F5F0E8' } },
  { id: 'e-main-config',  source: 'main',   target: 'config',  type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14, color: '#1A1A1A' }, style: { stroke: '#1A1A1A', strokeWidth: 1.5, strokeDasharray: '6 3' } },
  { id: 'e-api-auth',     source: 'api',    target: 'auth',    type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14, color: '#C29F60' }, style: { stroke: '#C29F60', strokeWidth: 2 } },
  { id: 'e-api-db',       source: 'api',    target: 'db_pool', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14, color: '#0055FF' }, style: { stroke: '#0055FF', strokeWidth: 2.5 } },
  { id: 'e-api-config',   source: 'api',    target: 'config',  type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14, color: '#1A1A1A' }, style: { stroke: '#1A1A1A', strokeWidth: 1.5, strokeDasharray: '6 3' } },
  { id: 'e-api-utils',    source: 'api',    target: 'utils',   type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14, color: '#1A1A1A' }, style: { stroke: '#1A1A1A', strokeWidth: 1.5 } },
  { id: 'e-api-routes',   source: 'api',    target: 'routes',  type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14, color: '#1A1A1A' }, style: { stroke: '#1A1A1A', strokeWidth: 2 } },
  { id: 'e-auth-db',      source: 'auth',   target: 'db_pool', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14, color: '#0055FF' }, style: { stroke: '#0055FF', strokeWidth: 2 } },
  { id: 'e-routes-auth',  source: 'routes', target: 'auth',    type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14, color: '#C29F60' }, style: { stroke: '#C29F60', strokeWidth: 1.5 } },
  { id: 'e-routes-db',    source: 'routes', target: 'db_pool', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14, color: '#0055FF' }, style: { stroke: '#0055FF', strokeWidth: 1.5 } },
  { id: 'e-routes-utils', source: 'routes', target: 'utils',   type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14, color: '#1A1A1A' }, style: { stroke: '#1A1A1A', strokeWidth: 1.5 } },
  { id: 'e-routes-schema',source: 'routes', target: 'schema',  type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14, color: '#1A1A1A' }, style: { stroke: '#1A1A1A', strokeWidth: 1.5 } },
  { id: 'e-db-schema',    source: 'db_pool',target: 'schema',  type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14, color: '#1A1A1A' }, style: { stroke: '#1A1A1A', strokeWidth: 2 } },
  { id: 'e-test-api',     source: 'tests',  target: 'api',     type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14, color: '#E63B2E' }, style: { stroke: '#E63B2E', strokeWidth: 1.5, strokeDasharray: '4 4' } },
  { id: 'e-test-config',  source: 'tests',  target: 'config',  type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14, color: '#E63B2E' }, style: { stroke: '#E63B2E', strokeWidth: 1, strokeDasharray: '4 4' } },
]

/* ── Props ──────────────────────────────────────── */
interface GraphCanvasProps {
  nodes?:         Node<GraphNodeData>[]
  edges?:         Edge[]
  onNodeSelect?:  (node: GraphNodeData) => void
  selectedId?:    string
  filterCategory?: NodeCategory | 'all'
  filterLang?:    Language | 'all'
  filterComplex?: Complexity | 'all'
  highlightedIds?: Set<string>
}

export function GraphCanvas({
  nodes:        initialNodes  = DEFAULT_GRAPH_NODES,
  edges:        initialEdges  = DEFAULT_GRAPH_EDGES,
  onNodeSelect,
  selectedId,
  filterCategory = 'all',
  filterLang     = 'all',
  filterComplex  = 'all',
  highlightedIds,
}: GraphCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, , onEdgesChange]         = useEdgesState(initialEdges)

  // Sync selected + filter styles
  useEffect(() => {
    setNodes(initialNodes.map((n) => {
      const d = n.data
      const catOk  = filterCategory === 'all' || d.category === filterCategory
      const langOk = filterLang     === 'all' || d.language  === filterLang
      const cxOk   = filterComplex  === 'all' || d.complexity === filterComplex
      const visible = catOk && langOk && cxOk
      const hi      = highlightedIds ? highlightedIds.has(n.id) : true

      return {
        ...n,
        selected: n.id === selectedId,
        style: {
          opacity: visible ? (hi ? 1 : 0.25) : 0.08,
          transition: 'opacity 0.2s',
        },
      }
    }))
  }, [selectedId, filterCategory, filterLang, filterComplex, highlightedIds, initialNodes, setNodes])

  const onConnect = useCallback((params: Connection) => {
    // read-only demo — no-op
  }, [])

  return (
    <div className="w-full h-full graph-grid">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={NODE_TYPES}
        onNodeClick={(_, node) => onNodeSelect?.(node.data)}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={2.5}
        defaultEdgeOptions={{ type: 'smoothstep' }}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="#ADADAD"
        />
        <Controls
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            background: '#FFFFFF',
            border: '2px solid #1A1A1A',
            borderRadius: 0,
            boxShadow: '3px 3px 0 #1A1A1A',
          }}
        />
        <MiniMap
          nodeColor={(n) => {
            const d = n.data as GraphNodeData
            if (n.id === selectedId) return '#FFCC00'
            if (d?.category === 'entry')    return '#1A1A1A'
            if (d?.category === 'database') return '#0055FF'
            if (d?.category === 'auth')     return '#C29F60'
            if (d?.category === 'test')     return '#E63B2E'
            return '#DAD6CE'
          }}
          style={{
            background: '#F5F0E8',
            border: '2px solid #1A1A1A',
            borderRadius: 0,
          }}
          maskColor="rgba(26,26,26,0.08)"
        />
      </ReactFlow>
    </div>
  )
}
