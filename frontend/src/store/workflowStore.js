import { create } from 'zustand'
import axios from 'axios'

const API = '/api'

export const useWorkflowStore = create((set, get) => ({
  // Canvas state
  nodes: [],
  edges: [],
  selectedNode: null,
  selectedEdge: null,
  canvasSyncKey: 0,

  // Workflow meta
  workflowName: 'Untitled Workflow',
  topology: 'hierarchical',

  // API data
  predefinedAgents: [],
  availableModels: [],
  availableTools: [],
  topologyTemplates: [],

  // Run state
  isRunning: false,
  runLogs: [],
  runOutput: '',
  runMetrics: null,

  // Experiment history
  experiments: [],

  // Message threads per node — { [nodeId]: [{ role, text, ts, fromNodeId? }] }
  agentMessages: {},

  // ── Canvas actions ──────────────────────────────────────────────────────
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  setWorkflowName: (name) => set({ workflowName: name }),

  setSelectedNode: (node) => set({ selectedNode: node }),

  setSelectedEdge: (edge) => set({ selectedEdge: edge }),

  // Post a message into a node's thread
  // role: 'user' | 'agent'  fromNodeId: optional source agent node id
  sendMessageToAgent: (nodeId, message) =>
    set((state) => ({
      agentMessages: {
        ...state.agentMessages,
        [nodeId]: [...(state.agentMessages[nodeId] || []), message],
      },
    })),

  // Simulate agent-to-agent message delivery along an edge
  // Called when user sends a message — it also echoes to the target node
  // of any outgoing directional/feedback/bidirectional edge from that node
  deliverAgentFeedback: (sourceNodeId, text) => {
    const { edges, nodes, agentMessages } = get()
    const ts = Date.now()

    // Find outgoing edges from this node
    const outgoing = edges.filter((e) => e.source === sourceNodeId)
    const updates = { ...agentMessages }

    // Also deliver to source (the sent message)
    updates[sourceNodeId] = [
      ...(updates[sourceNodeId] || []),
      { role: 'user', text, ts },
    ]

    outgoing.forEach((edge) => {
      const targetNode = nodes.find((n) => n.id === edge.target)
      if (!targetNode) return
      const senderNode = nodes.find((n) => n.id === sourceNodeId)
      updates[edge.target] = [
        ...(updates[edge.target] || []),
        {
          role: 'agent',
          text: `[${senderNode?.data?.label || 'Agent'} → ${edge.type || 'directional'}]: ${text}`,
          ts: ts + 1,
          fromNodeId: sourceNodeId,
          edgeType: edge.type,
        },
      ]
    })

    // bidirectional — also deliver in reverse (target → source)
    const incoming = edges.filter(
      (e) => e.target === sourceNodeId && e.type === 'bidirectional'
    )
    incoming.forEach((edge) => {
      const senderNode = nodes.find((n) => n.id === edge.source)
      updates[edge.source] = [
        ...(updates[edge.source] || []),
        {
          role: 'agent',
          text: `[${nodes.find((n) => n.id === sourceNodeId)?.data?.label || 'Agent'} → bidirectional]: ${text}`,
          ts: ts + 2,
          fromNodeId: sourceNodeId,
          edgeType: 'bidirectional',
        },
      ]
    })

    set({ agentMessages: updates })
  },

  // Change the type of an existing edge
  setEdgeType: (edgeId, newType) => {
    const meta = {
      directional:   { animated: true },
      feedback:      { animated: true },
      conditional:   { animated: true },
      bidirectional: { animated: true },
    }
    set((state) => ({
      edges: state.edges.map((e) =>
        e.id === edgeId
          ? { ...e, type: newType, animated: meta[newType]?.animated ?? true }
          : e
      ),
    }))
  },

  updateNodeConfig: (nodeId, updates) =>
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, ...updates } } : n
      ),
      selectedNode:
        state.selectedNode?.id === nodeId
          ? { ...state.selectedNode, data: { ...state.selectedNode.data, ...updates } }
          : state.selectedNode,
    })),

  // ── Load metadata from API ───────────────────────────────────────────────
  loadMeta: async () => {
    try {
      const [agentsRes, modelsRes, toolsRes, topologiesRes] = await Promise.all([
        axios.get(`${API}/agents/predefined`),
        axios.get(`${API}/models/available`),
        axios.get(`${API}/models/tools`),
        axios.get(`${API}/models/topologies`),
      ])
      set({
        predefinedAgents: agentsRes.data,
        availableModels: modelsRes.data,
        availableTools: toolsRes.data,
        topologyTemplates: topologiesRes.data,
      })
    } catch (e) {
      console.error('Failed to load metadata:', e.message)
    }
  },

  // ── Topology template ────────────────────────────────────────────────────
  applyTopologyTemplate: (template) => {
    const { nodes, predefinedAgents } = get()

    // ── CUSTOM: clear all edges, let user draw ──────────────────────────
    if (template.id === 'custom') {
      set({ topology: 'custom', edges: [] })
      return
    }

    // ── CANVAS HAS NODES: rewire edges using topology pattern ───────────
    if (nodes.length > 0) {
      const n = nodes.length
      const newEdges = []

      const makeEdge = (srcNode, tgtNode, idx) => ({
        id: `topo-${template.id}-${idx}-${Date.now()}`,
        source: srcNode.id,
        target: tgtNode.id,
        animated: true,
        style: { stroke: '#6366f1', strokeWidth: 2 },
      })

      if (template.id === 'hierarchical' || template.id === 'star') {
        // Node 0 is hub → connects to all others
        for (let i = 1; i < n; i++) {
          newEdges.push(makeEdge(nodes[0], nodes[i], i))
        }
        // Star also has all others → hub
        if (template.id === 'star') {
          for (let i = 1; i < n; i++) {
            newEdges.push(makeEdge(nodes[i], nodes[0], n + i))
          }
        }
      } else if (template.id === 'sequential') {
        // Chain: 0 → 1 → 2 → … → n-1
        for (let i = 0; i < n - 1; i++) {
          newEdges.push(makeEdge(nodes[i], nodes[i + 1], i))
        }
      } else if (template.id === 'peer_to_peer') {
        // Full mesh: every node → every other node
        let idx = 0
        for (let i = 0; i < n; i++) {
          for (let j = 0; j < n; j++) {
            if (i !== j) {
              newEdges.push(makeEdge(nodes[i], nodes[j], idx++))
            }
          }
        }
      } else {
        // Fallback for any unknown topology: sequential chain
        for (let i = 0; i < n - 1; i++) {
          newEdges.push(makeEdge(nodes[i], nodes[i + 1], i))
        }
      }

      set({ topology: template.id, edges: [...newEdges] })
      return
    }

    // ── EMPTY CANVAS: load template default agents + edges ──────────────
    const cols = 3
    const xSpacing = 230
    const ySpacing = 190

    const newNodes = template.default_agents.map((role, i) => {
      const meta = predefinedAgents.find((a) => a.role === role) || {}
      return {
        id: `${role}-${i}`,
        type: 'agentNode',
        position: {
          x: 80 + (i % cols) * xSpacing,
          y: 60 + Math.floor(i / cols) * ySpacing,
        },
        data: {
          role: meta.role || role,
          label: meta.label || role,
          color: meta.color || '#6366f1',
          icon: meta.icon || '🤖',
          model: meta.default_model || 'mock',
          strategy: meta.default_strategy || 'ReAct',
          tools: [...(meta.default_tools || [])],
          system_prompt: meta.default_prompt || '',
          max_iterations: 5,
        },
      }
    })

    const newEdges = template.edges.map((e, i) => {
      const srcIdx = template.default_agents.indexOf(e.source)
      const tgtIdx = template.default_agents.indexOf(e.target)
      return {
        id: `edge-${i}`,
        source: `${e.source}-${srcIdx}`,
        target: `${e.target}-${tgtIdx}`,
        animated: true,
        style: { stroke: '#6366f1', strokeWidth: 2 },
      }
    })

    set({ nodes: [...newNodes], edges: [...newEdges], topology: template.id })
  },

  // ── Add agent from palette ───────────────────────────────────────────────
  addAgent: (agentMeta) => {
    const { nodes } = get()
    const idx = nodes.length
    const cols = 4
    const newNode = {
      id: `${agentMeta.role}-${Date.now()}`,
      type: 'agentNode',
      position: {
        x: 80 + (idx % cols) * 230,
        y: 60 + Math.floor(idx / cols) * 190,
      },
      data: {
        role: agentMeta.role,
        label: agentMeta.label,
        color: agentMeta.color || '#6366f1',
        icon: agentMeta.icon || '🤖',
        model: agentMeta.default_model || 'mock',
        strategy: agentMeta.default_strategy || 'ReAct',
        tools: [...(agentMeta.default_tools || [])],
        system_prompt: agentMeta.default_prompt || '',
        max_iterations: 5,
      },
    }
    // Spread into a new array so the reference changes → useEffect in canvas fires
    set({ nodes: [...nodes, newNode] })
  },

  // ── Save workflow ────────────────────────────────────────────────────────
  saveWorkflow: async () => {
    const { nodes, edges, workflowName, topology } = get()
    const payload = {
      name: workflowName,
      topology,
      agents: nodes.map((n) => ({
        id: n.id,
        role: n.data.role,
        model: n.data.model,
        strategy: n.data.strategy,
        tools: n.data.tools,
        system_prompt: n.data.system_prompt,
        max_iterations: n.data.max_iterations,
        position: n.position,
      })),
      edges: edges.map((e) => ({
        source: e.source,
        target: e.target,
        type: e.type || 'default',
      })),
    }
    const res = await axios.post(`${API}/workflows/`, payload)
    return res.data
  },

  // ── Run workflow ─────────────────────────────────────────────────────────
  runWorkflow: async (prompt) => {
    set({ isRunning: true, runLogs: [], runOutput: '', runMetrics: null })
    try {
      const saved = await get().saveWorkflow()
      const res = await axios.post(`${API}/experiments/${saved.id}/run`, {
        input_prompt: prompt,
      })
      set({
        runLogs: res.data.logs || [],
        runOutput: res.data.output || '',
        runMetrics: {
          latency_ms: res.data.latency_ms,
          total_tokens: res.data.total_tokens,
          agent_calls: res.data.agent_calls,
          status: res.data.status,
        },
      })
    } catch (e) {
      set({
        runOutput: `Error: ${e.response?.data?.detail || e.message}`,
        runLogs: [],
      })
    } finally {
      set({ isRunning: false })
    }
  },

  // ── Experiments ──────────────────────────────────────────────────────────
  loadExperiments: async () => {
    try {
      const res = await axios.get(`${API}/experiments/`)
      set({ experiments: res.data })
    } catch (e) {
      console.error('Failed to load experiments:', e.message)
    }
  },
}))
