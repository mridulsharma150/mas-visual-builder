import { useWorkflowStore } from '../../store/workflowStore'
import { Settings } from 'lucide-react'

const STRATEGIES = ['ReAct', 'CoT', 'Reflexion', 'ZERO_SHOT', 'Plan-and-Execute']

export default function ConfigPanel() {
  const { selectedNode, availableModels, availableTools, updateNodeConfig } = useWorkflowStore()

  if (!selectedNode) {
    return (
      <aside className="w-72 bg-slate-900 border-l border-slate-800 shrink-0
                        flex flex-col items-center justify-center gap-2">
        <Settings size={28} className="text-slate-700" />
        <p className="text-slate-600 text-sm text-center">
          Click an agent on the canvas
          <br />to configure it here
        </p>
      </aside>
    )
  }

  const d = selectedNode.data
  const upd = (key, val) => updateNodeConfig(selectedNode.id, { [key]: val })

  const modelInfo = availableModels.find((m) => m.id === d.model)

  return (
    <aside className="w-72 bg-slate-900 border-l border-slate-800 overflow-y-auto
                      p-4 flex flex-col gap-4 shrink-0">

      {/* Header */}
      <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
        <span className="text-2xl">{d.icon}</span>
        <div>
          <h2 className="font-semibold text-slate-100 leading-tight">{d.label}</h2>
          <p className="text-[11px] text-slate-500 capitalize">{d.role} agent</p>
        </div>
      </div>

      {/* LLM Model */}
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">LLM Model</label>
        <select
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5
                     text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          value={d.model}
          onChange={(e) => upd('model', e.target.value)}
        >
          {availableModels.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label} — {m.provider}
            </option>
          ))}
        </select>
        {modelInfo && (
          <p className="text-[10px] text-slate-600 mt-1">
            Context: {(modelInfo.context / 1000).toFixed(0)}k tokens ·
            Cost: ${modelInfo.cost_per_1k}/1k
          </p>
        )}
      </div>

      {/* Reasoning Strategy */}
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">
          Reasoning Strategy
        </label>
        <select
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5
                     text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          value={d.strategy}
          onChange={(e) => upd('strategy', e.target.value)}
        >
          {STRATEGIES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Tools */}
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-2">Tools</label>
        <div className="flex flex-col gap-1.5">
          {availableTools.map((tool) => (
            <label
              key={tool.id}
              className="flex items-start gap-2.5 cursor-pointer group"
            >
              <input
                type="checkbox"
                checked={(d.tools || []).includes(tool.id)}
                onChange={(e) => {
                  const current = d.tools || []
                  upd(
                    'tools',
                    e.target.checked
                      ? [...current, tool.id]
                      : current.filter((t) => t !== tool.id)
                  )
                }}
                className="mt-0.5 accent-indigo-500 shrink-0"
              />
              <div>
                <p className="text-sm text-slate-300 leading-tight">{tool.label}</p>
                <p className="text-[10px] text-slate-600 leading-tight">{tool.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Max Iterations */}
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">
          Max Iterations: <span className="text-indigo-400">{d.max_iterations}</span>
        </label>
        <input
          type="range"
          min={1}
          max={20}
          value={d.max_iterations}
          onChange={(e) => upd('max_iterations', Number(e.target.value))}
          className="w-full accent-indigo-500"
        />
        <div className="flex justify-between text-[10px] text-slate-600">
          <span>1</span><span>20</span>
        </div>
      </div>

      {/* System Prompt */}
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">
          System Prompt
        </label>
        <textarea
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2
                     text-sm text-slate-200 h-32 resize-none focus:outline-none
                     focus:ring-2 focus:ring-indigo-500 leading-relaxed"
          value={d.system_prompt}
          onChange={(e) => upd('system_prompt', e.target.value)}
          placeholder="Describe what this agent should do…"
        />
      </div>
    </aside>
  )
}
