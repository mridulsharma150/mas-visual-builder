import { useWorkflowStore } from '../store/workflowStore'

export default function TopologyBar() {
  const { topologyTemplates, topology, applyTopologyTemplate } = useWorkflowStore()

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-slate-900 border-b border-slate-800
                    overflow-x-auto shrink-0 z-10">
      <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider shrink-0">
        Topology:
      </span>
      {topologyTemplates.map((t) => (
        <button
          key={t.id}
          onClick={() => applyTopologyTemplate(t)}
          title={t.description}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium
                      shrink-0 transition-colors border
            ${
              topology === t.id
                ? 'bg-indigo-600 border-indigo-500 text-white'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:border-slate-600'
            }`}
        >
          <span>{t.icon}</span>
          {t.label}
        </button>
      ))}
    </div>
  )
}
