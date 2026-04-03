import { useCallback, useEffect, useRef } from 'react'
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

const nodeTypes = { agentNode: AgentNode }

export default function WorkflowCanvas() {
  const { setNodes, setEdges, setSelectedNode } = useWorkflowStore()

  // Subscribe to store nodes/edges as refs — so we can react to them
  // without causing infinite re-render loops
  const storeNodes = useWorkflowStore((s) => s.nodes)
  const storeEdges = useWorkflowStore((s) => s.edges)

  const [nodes, setLocalNodes, onNodesChange] = useNodesState([])
  const [edges, setLocalEdges, onEdgesChange] = useEdgesState([])

  // Track previous store arrays by reference so we only sync
  // when the store intentionally sets a new array (addAgent / topology switch)
  // — NOT when the store is updated from the canvas itself (drag, etc.)
  const prevStoreNodes = useRef(storeNodes)
  const prevStoreEdges = useRef(storeEdges)
  const isSyncingToStore = useRef(false)

  useEffect(() => {
    // Skip if this change was caused by us pushing canvas → store
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

  // Sync canvas drag/delete → store without triggering the effect above
  const handleNodesChange = useCallback(
    (changes) => {
      onNodesChange(changes)
      isSyncingToStore.current = true
      setLocalNodes((nds) => {
        setNodes(nds)
        prevStoreNodes.current = nds  // keep ref in sync
        return nds
      })
      // reset flag after React finishes this render cycle
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

  const onConnect = useCallback(
    (params) => {
      const newEdge = {
        ...params,
        animated: true,
        style: { stroke: '#6366f1', strokeWidth: 2 },
      }
      setLocalEdges((eds) => {
        const updated = addEdge(newEdge, eds)
        setEdges(updated)
        prevStoreEdges.current = updated
        return updated
      })
    },
    [setLocalEdges, setEdges]
  )

  const onNodeClick = useCallback((_, node) => setSelectedNode(node), [setSelectedNode])
  const onPaneClick = useCallback(() => setSelectedNode(null), [setSelectedNode])

  return (
    <div className="flex-1 h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
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
    </div>
  )
}