import { useEffect, useState } from 'react'
import { useWorkflowStore } from './store/workflowStore'
import WorkflowCanvas from './components/Canvas/WorkflowCanvas'
import AgentPalette from './components/Sidebar/AgentPalette'
import ConfigPanel from './components/Sidebar/ConfigPanel'
import TopologyBar from './components/TopologyBar'
import RunPanel from './components/RunPanel'
import ExperimentsDrawer from './components/ExperimentsDrawer'
import { FlaskConical, Save, Play, BarChart2 } from 'lucide-react'

export default function App() {
  const { loadMeta, workflowName, setWorkflowName, saveWorkflow } = useWorkflowStore()
  const [showExperiments, setShowExperiments] = useState(false)
  const [showRunPanel, setShowRunPanel] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => { loadMeta() }, [])

  const handleSave = async () => {
    await saveWorkflow()
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden">

      {/* ── Top Nav ── */}
      <header className="flex items-center gap-3 px-4 py-2 bg-slate-900 border-b border-slate-800 z-20 shrink-0">
        <div className="flex items-center gap-2 font-bold text-indigo-400 text-lg select-none">
          <FlaskConical size={20} />
          <span>MAS Builder</span>
        </div>

        <div className="w-px h-6 bg-slate-700" />

        <input
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1 text-sm w-56
                     focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-200"
          value={workflowName}
          onChange={(e) => setWorkflowName(e.target.value)}
          placeholder="Workflow name…"
        />

        <div className="flex-1" />

        <button
          onClick={() => setShowRunPanel((v) => !v)}
          className="flex items-center gap-2 px-4 py-1.5 bg-green-600 hover:bg-green-500
                     rounded-lg text-sm font-semibold transition-colors"
        >
          <Play size={14} /> Run
        </button>

        <button
          onClick={handleSave}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors
            ${saved
              ? 'bg-indigo-700 text-white'
              : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
            }`}
        >
          <Save size={14} />
          {saved ? 'Saved ✓' : 'Save'}
        </button>

        <button
          onClick={() => setShowExperiments((v) => !v)}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600
                     rounded-lg text-sm text-slate-200 transition-colors"
        >
          <BarChart2 size={14} /> Experiments
        </button>
      </header>

      {/* ── Topology Bar ── */}
      <TopologyBar />

      {/* ── Main Layout ── */}
      <div className="flex flex-1 min-h-0 relative">
        <AgentPalette />
        <WorkflowCanvas />
        <ConfigPanel />

        {showRunPanel && <RunPanel onClose={() => setShowRunPanel(false)} />}
        {showExperiments && (
          <ExperimentsDrawer onClose={() => setShowExperiments(false)} />
        )}
      </div>
    </div>
  )
}
