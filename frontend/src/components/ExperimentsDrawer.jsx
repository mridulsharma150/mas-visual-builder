import { useEffect } from 'react'
import { useWorkflowStore } from '../store/workflowStore'
import { X, CheckCircle2, XCircle, Clock } from 'lucide-react'

export default function ExperimentsDrawer({ onClose }) {
  const { experiments, loadExperiments } = useWorkflowStore()

  useEffect(() => {
    loadExperiments()
  }, [])

  return (
    <div className="absolute right-0 top-0 h-full w-96 bg-slate-900 border-l border-slate-700
                    z-40 flex flex-col shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 shrink-0">
        <h2 className="font-semibold text-slate-100">📊 Experiment History</h2>
        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
          <X size={18} />
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {experiments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2 text-slate-600">
            <Clock size={28} />
            <p className="text-sm text-center">
              No experiments yet.
              <br />
              Run a workflow to see results here.
            </p>
          </div>
        ) : (
          experiments.map((e) => (
            <div
              key={e.id}
              className="bg-slate-800 rounded-xl p-3 border border-slate-700 text-sm"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="font-medium text-slate-200 truncate">{e.workflow_name}</p>
                <span
                  className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full shrink-0 ${
                    e.status === 'completed'
                      ? 'bg-green-900 text-green-300'
                      : 'bg-red-900 text-red-300'
                  }`}
                >
                  {e.status === 'completed' ? (
                    <CheckCircle2 size={10} />
                  ) : (
                    <XCircle size={10} />
                  )}
                  {e.status}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1 text-xs text-slate-400">
                <div className="bg-slate-900 rounded-lg p-1.5 text-center">
                  <p className="font-semibold text-slate-200">{e.latency_ms}</p>
                  <p className="text-[10px]">ms</p>
                </div>
                <div className="bg-slate-900 rounded-lg p-1.5 text-center">
                  <p className="font-semibold text-slate-200">{e.total_tokens}</p>
                  <p className="text-[10px]">tokens</p>
                </div>
                <div className="bg-slate-900 rounded-lg p-1.5 text-center">
                  <p className="font-semibold text-slate-200">{e.agent_calls}</p>
                  <p className="text-[10px]">calls</p>
                </div>
              </div>

              <p className="text-[10px] text-slate-600 mt-2">
                {new Date(e.created_at).toLocaleString()}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
