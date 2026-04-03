import { useState } from 'react'
import { useWorkflowStore } from '../../store/workflowStore'
import { Plus, Wand2, X } from 'lucide-react'

const ROLE_OPTIONS = [
  'coordinator', 'planner', 'researcher', 'analyst', 'coder', 'critic', 'custom'
]

const STRATEGY_OPTIONS = ['ReAct', 'CoT', 'Reflexion', 'ZERO_SHOT', 'Plan-and-Execute']

const COLOR_PRESETS = [
  '#6366f1', '#f59e0b', '#10b981', '#3b82f6',
  '#8b5cf6', '#ef4444', '#ec4899', '#14b8a6',
  '#f97316', '#a3e635',
]

const ICON_PRESETS = [
  '🤖', '🧠', '⚡', '🎯', '🔧', '🛠️', '🗂️', '📝',
  '🧩', '🔬', '🌐', '💡', '🏗️', '🎨', '🚀', '🔐',
]

const DEFAULT_FORM = {
  label: '',
  role: 'custom',
  icon: '🤖',
  color: '#6366f1',
  description: '',
  default_model: 'mock',
  default_strategy: 'ReAct',
  default_tools: [],
  default_prompt: '',
}

export default function AgentPalette() {
  const { predefinedAgents, availableModels, availableTools, addAgent } = useWorkflowStore()
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(DEFAULT_FORM)

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }))

  const toggleTool = (toolId) =>
    set(
      'default_tools',
      form.default_tools.includes(toolId)
        ? form.default_tools.filter((t) => t !== toolId)
        : [...form.default_tools, toolId]
    )

  const handleAdd = () => {
    if (!form.label.trim()) return
    addAgent({ ...form })
    setShowModal(false)
    setForm(DEFAULT_FORM)
  }

  return (
    <>
      <aside
        className="w-52 bg-slate-900 border-r border-slate-800 overflow-y-auto
                   flex flex-col gap-1 p-3 shrink-0"
      >
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1">
          Agent Roles
        </p>

        {predefinedAgents.map((agent) => (
          <button
            key={agent.role}
            onClick={() => addAgent(agent)}
            className="group flex items-center gap-2.5 px-2.5 py-2 rounded-lg border border-slate-700
                       hover:border-indigo-500 bg-slate-800 hover:bg-slate-750 text-left
                       transition-all duration-100"
          >
            <span className="text-xl shrink-0">{agent.icon}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-200 leading-tight">{agent.label}</p>
              <p className="text-[10px] text-slate-500 leading-tight mt-0.5 line-clamp-2">
                {agent.description}
              </p>
            </div>
            <Plus size={14} className="text-slate-600 group-hover:text-indigo-400 shrink-0 transition-colors" />
          </button>
        ))}

        {/* ── Custom Agent Card ── */}
        <div className="mt-2 border-t border-slate-800 pt-3">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1">
            Custom
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="group w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg
                       border border-dashed border-indigo-700 hover:border-indigo-400
                       bg-indigo-950/40 hover:bg-indigo-900/40 text-left transition-all duration-100"
          >
            <span className="text-xl shrink-0">🧩</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-indigo-300 leading-tight">Custom Agent</p>
              <p className="text-[10px] text-slate-500 leading-tight mt-0.5">
                Build your own from scratch
              </p>
            </div>
            <Wand2 size={14} className="text-indigo-600 group-hover:text-indigo-400 shrink-0 transition-colors" />
          </button>
        </div>

        <p className="text-[10px] text-slate-600 text-center mt-3">
          Click to add · Delete to remove
        </p>
      </aside>

      {/* ── Custom Agent Builder Modal ── */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
        >
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-[480px] max-h-[90vh] overflow-y-auto p-6 flex flex-col gap-5">

            {/* Modal Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wand2 size={18} className="text-indigo-400" />
                <h2 className="text-lg font-semibold text-slate-100">Build Custom Agent</h2>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-500 hover:text-slate-300 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Agent Name */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Agent Name <span className="text-red-400">*</span>
              </label>
              <input
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2
                           text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500
                           placeholder-slate-600"
                placeholder="e.g. Summariser, Validator, Domain Expert…"
                value={form.label}
                onChange={(e) => set('label', e.target.value)}
              />
            </div>

            {/* Role */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Role Type</label>
              <select
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2
                           text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.role}
                onChange={(e) => set('role', e.target.value)}
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                ))}
              </select>
            </div>

            {/* Icon picker */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">Icon</label>
              <div className="flex flex-wrap gap-2">
                {ICON_PRESETS.map((ic) => (
                  <button
                    key={ic}
                    onClick={() => set('icon', ic)}
                    className={`text-xl w-9 h-9 rounded-lg flex items-center justify-center transition-all
                      ${form.icon === ic
                        ? 'bg-indigo-600 ring-2 ring-indigo-400'
                        : 'bg-slate-800 hover:bg-slate-700 border border-slate-700'
                      }`}
                  >
                    {ic}
                  </button>
                ))}
                {/* Custom emoji input */}
                <input
                  className="w-9 h-9 bg-slate-800 border border-slate-700 rounded-lg text-center
                             text-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  maxLength={2}
                  value={!ICON_PRESETS.includes(form.icon) ? form.icon : ''}
                  placeholder="?"
                  onChange={(e) => e.target.value && set('icon', e.target.value)}
                  title="Type any emoji"
                />
              </div>
            </div>

            {/* Color picker */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">Node Colour</label>
              <div className="flex items-center gap-2 flex-wrap">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c}
                    onClick={() => set('color', c)}
                    style={{ background: c }}
                    className={`w-7 h-7 rounded-full transition-all
                      ${form.color === c
                        ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110'
                        : 'hover:scale-110'
                      }`}
                  />
                ))}
                <input
                  type="color"
                  value={form.color}
                  onChange={(e) => set('color', e.target.value)}
                  className="w-7 h-7 rounded-full cursor-pointer bg-transparent border-0"
                  title="Pick custom colour"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Description</label>
              <input
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2
                           text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500
                           placeholder-slate-600"
                placeholder="Short description shown in the palette…"
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
              />
            </div>

            {/* LLM Model */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">LLM Model</label>
              <select
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2
                           text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.default_model}
                onChange={(e) => set('default_model', e.target.value)}
              >
                {availableModels.map((m) => (
                  <option key={m.id} value={m.id}>{m.label} — {m.provider}</option>
                ))}
              </select>
            </div>

            {/* Strategy */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Reasoning Strategy</label>
              <select
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2
                           text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.default_strategy}
                onChange={(e) => set('default_strategy', e.target.value)}
              >
                {STRATEGY_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Tools */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">Tools</label>
              <div className="flex flex-col gap-2">
                {availableTools.map((tool) => (
                  <label key={tool.id} className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.default_tools.includes(tool.id)}
                      onChange={() => toggleTool(tool.id)}
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

            {/* System Prompt */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">System Prompt</label>
              <textarea
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2
                           text-sm text-slate-200 h-28 resize-none focus:outline-none
                           focus:ring-2 focus:ring-indigo-500 placeholder-slate-600 leading-relaxed"
                placeholder="You are a specialised agent that…"
                value={form.default_prompt}
                onChange={(e) => set('default_prompt', e.target.value)}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => { setShowModal(false); setForm(DEFAULT_FORM) }}
                className="flex-1 py-2 rounded-lg border border-slate-700 text-slate-400
                           hover:border-slate-500 hover:text-slate-200 text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={!form.label.trim()}
                className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white
                           text-sm font-semibold transition-colors disabled:opacity-40
                           disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Plus size={14} /> Add to Canvas
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  )
}