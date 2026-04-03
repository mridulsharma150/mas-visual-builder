import { create } from 'zustand'
import axios from 'axios'

const API = '/api'

export const useWorkflowStore = create((set, get) => ({
  // Canvas state
  nodes: [],
  edges: [],
  selectedNode: null,

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

  // ── Canvas actions ──────────────────────────────────────────────────────
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  setSelectedNode: (node) => set({ selectedNode: node }),

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
    const { predefinedAgents } = get()
    const cols = 3
    const xSpacing = 230
    const ySpacing = 190

    const nodes = template.default_agents.map((role, i) => {
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

    const edges = template.edges.map((e, i) => {
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

    set({ nodes, edges, topology: template.id })
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
        color: agentMeta.color,
        icon: agentMeta.icon,
        model: agentMeta.default_model,
        strategy: agentMeta.default_strategy,
        tools: [...agentMeta.default_tools],
        system_prompt: agentMeta.default_prompt,
        max_iterations: 5,
      },
    }
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
