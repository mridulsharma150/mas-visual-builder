import { useCallback, useEffect } from 'react'
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
  const { nodes: storeNodes, edges: storeEdges, setNodes, setEdges, setSelectedNode } =
    useWorkflowStore()

  const [nodes, setLocalNodes, onNodesChange] = useNodesState(storeNodes)
  const [edges, setLocalEdges, onEdgesChange] = useEdgesState(storeEdges)

  // Sync store -> local when topology template is applied
  useEffect(() => {
    setLocalNodes(storeNodes)
    setLocalEdges(storeEdges)
  }, [storeNodes, storeEdges])

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
        return updated
      })
    },
    []
  )

  const handleNodesChange = (changes) => {
    onNodesChange(changes)
    setNodes(nodes)
  }

  const onNodeClick = (_, node) => setSelectedNode(node)

  const onPaneClick = () => setSelectedNode(null)

  return (
    <div className="flex-1 h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
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
