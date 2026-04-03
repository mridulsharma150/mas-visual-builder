import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useWorkflowStore } from '../../store/workflowStore'
import AgentNode from './AgentNode'
import {
  DirectionalEdge,
  FeedbackEdge,
  ConditionalEdge,
  BidirectionalEdge,
  EdgeMarkerDefs,
  EDGE_TYPE_META,
} from './CustomEdges'

const nodeTypes = { agentNode: AgentNode }
const edgeTypes = {
  directional:   DirectionalEdge,
  feedback:      FeedbackEdge,
  conditional:   ConditionalEdge,
  bidirectional: BidirectionalEdge,
}

// ── Edge-type picker — appears near where user drops a connection ─────────
function EdgeTypePicker({ position, onPick, onCancel }) {
  return (
    <div
      className="fixed z-50"
      style={{ left: position.x, top: position.y }}
    >
      {/* Backdrop */}
      <div className="fixed inset-0" onClick={onCancel} />

      <div className="relative bg-slate-900 border border-slate-700 rounded-2xl
                      shadow-2xl p-3 w-64 flex flex-col gap-1.5">
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-1 mb-1">
          Connection Type
        </p>

        {Object.entries(EDGE_TYPE_META).map(([type, meta]) => (
          <button
            key={type}
            onClick={() => onPick(type)}
            className="flex items-start gap-3 px-3 py-2.5 rounded-xl text-left
                       hover:bg-slate-800 transition-colors group"
          >
            <span
              className="text-lg mt-0.5 shrink-0"
              style={{ color: meta.color }}
            >
              {meta.icon}
            </span>
            <div>
              <p
                className="text-sm font-semibold leading-tight"
                style={{ color: meta.color }}
              >
                {meta.label}
              </p>
              <p className="text-[10px] text-slate-500 leading-snug mt-0.5">
                {meta.description}
              </p>
            </div>
          </button>
        ))}

        <button
          onClick={onCancel}
          className="mt-1 text-xs text-slate-600 hover:text-slate-400 text-center py-1"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

export default function WorkflowCanvas() {
  const { setNodes, setEdges, setSelectedNode, setSelectedEdge } = useWorkflowStore()

  const storeNodes = useWorkflowStore((s) => s.nodes)
  const storeEdges = useWorkflowStore((s) => s.edges)

  const [nodes, setLocalNodes, onNodesChange] = useNodesState([])
  const [edges, setLocalEdges, onEdgesChange] = useEdgesState([])

  // Pending connection — waiting for user to pick edge type
  const [pendingConnection, setPendingConnection] = useState(null) // { params, mousePos }

  const prevStoreNodes = useRef(storeNodes)
  const prevStoreEdges = useRef(storeEdges)
  const isSyncingToStore = useRef(false)

  useEffect(() => {
    if (isSyncingToStore.current) return
    if (storeNodes !== prevStoreNodes.current) {
      prevStoreNodes.current = storeNodes
      setLocalNodes(storeNodes)
    }
    if (storeEdges !== prevStoreEdges.current) {
      prevStoreEdges.current = storeEdges
      setLocalEdges(storeEdges)
    }
  }, [storeNodes, storeEdges])

  const handleNodesChange = useCallback(
    (changes) => {
      onNodesChange(changes)
      isSyncingToStore.current = true
      setLocalNodes((nds) => {
        setNodes(nds)
        prevStoreNodes.current = nds
        return nds
      })
      requestAnimationFrame(() => { isSyncingToStore.current = false })
    },
    [onNodesChange, setLocalNodes, setNodes]
  )

  const handleEdgesChange = useCallback(
    (changes) => {
      onEdgesChange(changes)
      isSyncingToStore.current = true
      setLocalEdges((eds) => {
        setEdges(eds)
        prevStoreEdges.current = eds
        return eds
      })
      requestAnimationFrame(() => { isSyncingToStore.current = false })
    },
    [onEdgesChange, setLocalEdges, setEdges]
  )

  // Step 1: user drops a connection → show picker
  const onConnect = useCallback((params, event) => {
    // Get mouse position from the last known mouse event on the canvas
    const rect = document.querySelector('.react-flow')?.getBoundingClientRect()
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2
    const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2
    setPendingConnection({ params, mousePos: { x: x - 130, y: y - 60 } })
  }, [])

  // Capture mouse position on connect end for better picker placement
  const onConnectEnd = useCallback((event) => {
    if (!pendingConnection) return
    const mx = event?.clientX ?? window.innerWidth / 2
    const my = event?.clientY ?? window.innerHeight / 2
    setPendingConnection((prev) => prev
      ? { ...prev, mousePos: { x: mx - 130, y: my + 10 } }
      : null
    )
  }, [pendingConnection])

  // Step 2: user picks a type → create the edge
  const handlePickEdgeType = useCallback((type) => {
    if (!pendingConnection) return
    const meta = EDGE_TYPE_META[type]
    const newEdge = {
      ...pendingConnection.params,
      id: `edge-${Date.now()}`,
      type,
      animated: meta.animated,
      data: {},
    }
    setLocalEdges((eds) => {
      const updated = addEdge(newEdge, eds)
      setEdges(updated)
      prevStoreEdges.current = updated
      return updated
    })
    setPendingConnection(null)
  }, [pendingConnection, setLocalEdges, setEdges])

  // Click on an edge → select it in the store so ConfigPanel could show it
  const onEdgeClick = useCallback((_, edge) => {
    setSelectedEdge(edge)
    setSelectedNode(null)
  }, [setSelectedEdge, setSelectedNode])

  const onNodeClick = useCallback((_, node) => {
    setSelectedNode(node)
    setSelectedEdge(null)
  }, [setSelectedNode])

  const onPaneClick = useCallback(() => {
    setSelectedNode(null)
    setSelectedEdge(null)
  }, [setSelectedNode])

  return (
    <div className="flex-1 h-full relative">
      <EdgeMarkerDefs />

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onConnectEnd={onConnectEnd}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        deleteKeyCode="Delete"
        className="bg-slate-950"
      >
        <Background color="#1e293b" gap={28} size={1.5} />
        <Controls />
        <MiniMap
          nodeColor={(n) => n.data?.color || '#6366f1'}
          maskColor="rgba(15,23,42,0.7)"
        />
      </ReactFlow>

      {/* Edge type picker popup */}
      {pendingConnection && (
        <EdgeTypePicker
          position={pendingConnection.mousePos}
          onPick={handlePickEdgeType}
          onCancel={() => setPendingConnection(null)}
        />
      )}
    </div>
  )
}