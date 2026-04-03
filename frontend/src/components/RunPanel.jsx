import { useState } from 'react'
import { useWorkflowStore } from '../store/workflowStore'
import { X, Play, Loader2, CheckCircle2, XCircle } from 'lucide-react'

export default function RunPanel({ onClose }) {
  const { runWorkflow, isRunning, runLogs, runOutput, runMetrics } = useWorkflowStore()
  const [prompt, setPrompt] = useState('')

  const handleRun = () => {
    if (prompt.trim()) runWorkflow(prompt)
  }

  return (
    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-40
                    flex items-end justify-center">
      <div
        className="w-full max-w-4xl bg-slate-900 border border-slate-700 border-b-0
                   rounded-t-2xl p-5 flex flex-col gap-4 max-h-[72vh] shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between shrink-0">
          <h2 className="font-semibold text-lg">▶ Run Workflow</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Prompt input */}
        <div className="flex gap-3 shrink-0">
          <textarea
            className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5
                       text-sm text-slate-200 h-20 resize-none focus:outline-none
                       focus:ring-2 focus:ring-green-500 placeholder-slate-600"
            placeholder="Enter your task or question for the agent workflow…"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.metaKey) handleRun()
            }}
          />
          <button
            disabled={isRunning || !prompt.trim()}
            onClick={handleRun}
            className="px-6 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-40
                       disabled:cursor-not-allowed rounded-xl font-semibold
                       flex flex-col items-center gap-1 transition-colors shrink-0"
          >
            {isRunning ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Play size={18} />
            )}
            <span className="text-xs">{isRunning ? 'Running' : '⌘↵'}</span>
          </button>
        </div>

        {/* Metrics bar */}
        {runMetrics && (
          <div className="flex items-center gap-4 text-sm shrink-0 flex-wrap">
            {runMetrics.status === 'completed' ? (
              <CheckCircle2 size={16} className="text-green-400" />
            ) : (
              <XCircle size={16} className="text-red-400" />
            )}
            <span className="text-slate-300">⏱ {runMetrics.latency_ms} ms</span>
            <span className="text-slate-300">🪙 {runMetrics.total_tokens} tokens</span>
            <span className="text-slate-300">🤖 {runMetrics.agent_calls} agent calls</span>
            <span
              className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full ${
                runMetrics.status === 'completed'
                  ? 'bg-green-900 text-green-300'
                  : 'bg-red-900 text-red-300'
              }`}
            >
              {runMetrics.status}
            </span>
          </div>
        )}

        {/* Logs */}
        <div className="flex-1 overflow-y-auto flex flex-col gap-2 min-h-0">
          {isRunning && runLogs.length === 0 && (
            <div className="flex items-center justify-center h-20 text-slate-500 text-sm">
              <Loader2 size={16} className="animate-spin mr-2" /> Running agents…
            </div>
          )}

          {runLogs.map((log, i) => (
            <div key={i} className="bg-slate-800 rounded-xl p-3 border border-slate-700 text-sm">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="font-semibold text-indigo-300 capitalize">{log.role}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-400">
                  {log.model}
                </span>
                <span className="text-xs text-slate-600 ml-auto">
                  {log.latency_ms} ms · {log.tokens} tokens
                </span>
              </div>
              <p className="text-slate-300 text-xs leading-relaxed whitespace-pre-wrap">
                {log.output}
              </p>
            </div>
          ))}

          {runOutput && (
            <div className="bg-indigo-950 border border-indigo-600 rounded-xl p-4 text-sm">
              <p className="text-xs font-semibold text-indigo-400 mb-2 uppercase tracking-wide">
                ✦ Final Output
              </p>
              <p className="text-slate-200 leading-relaxed whitespace-pre-wrap">{runOutput}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
