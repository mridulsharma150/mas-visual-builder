import { useWorkflowStore } from '../../store/workflowStore'
import { Plus } from 'lucide-react'

export default function AgentPalette() {
  const { predefinedAgents, addAgent } = useWorkflowStore()

  return (
    <aside className="w-52 bg-slate-900 border-r border-slate-800 overflow-y-auto
                      flex flex-col gap-1 p-3 shrink-0">
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
          <Plus
            size={14}
            className="text-slate-600 group-hover:text-indigo-400 shrink-0 transition-colors"
          />
        </button>
      ))}

      <p className="text-[10px] text-slate-600 text-center mt-3">
        Click to add · Delete to remove
      </p>
    </aside>
  )
}
