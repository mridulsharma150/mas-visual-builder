import { Handle, Position } from '@xyflow/react'
import { useWorkflowStore } from '../../store/workflowStore'

export default function AgentNode({ id, data, selected }) {
  const { nodes, setSelectedNode } = useWorkflowStore()

  const handleClick = () => {
    const node = nodes.find((n) => n.id === id)
    if (node) setSelectedNode(node)
  }

  return (
    <div
      onClick={handleClick}
      className="min-w-[170px] max-w-[200px] rounded-xl border-2 p-3 cursor-pointer
                 transition-all duration-150 select-none"
      style={{
        background: `${data.color}18`,
        borderColor: selected ? '#818cf8' : `${data.color}99`,
        boxShadow: selected ? `0 0 0 3px ${data.color}44` : 'none',
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-slate-500 !border-slate-700"
      />

      <div className="flex items-center gap-2">
        <span className="text-2xl leading-none">{data.icon}</span>
        <div className="min-w-0">
          <p className="font-semibold text-sm text-slate-100 truncate">{data.label}</p>
          <p className="text-[11px] text-slate-400 truncate capitalize">
            {data.model?.split('-').slice(0, 2).join('-')}
          </p>
        </div>
      </div>

      {data.tools?.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {data.tools.map((t) => (
            <span
              key={t}
              className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700"
            >
              {t.replace('_', ' ')}
            </span>
          ))}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-indigo-500 !border-indigo-700"
      />
    </div>
  )
}
