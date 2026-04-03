import { useState } from 'react'
import { Handle, Position } from '@xyflow/react'
import { MessageSquare, X, Send } from 'lucide-react'
import { useWorkflowStore } from '../../store/workflowStore'

// ── Message Popup ────────────────────────────────────────────────────────
function AgentMessagePopup({ nodeId, data, onClose }) {
  const { agentMessages, deliverAgentFeedback } = useWorkflowStore()
  const [text, setText] = useState('')
  const messages = agentMessages[nodeId] || []

  const handleSend = () => {
    if (!text.trim()) return
    deliverAgentFeedback(nodeId, text.trim())
    setText('')
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center pb-10"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-[420px] bg-slate-900 border border-slate-700 rounded-2xl
                   shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: '68vh' }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-800 shrink-0"
          style={{ borderLeft: `3px solid ${data.color}` }}
        >
          <span className="text-xl">{data.icon}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-100 leading-tight">{data.label}</p>
            <p className="text-[10px] text-slate-500 capitalize">{data.role} · {data.model}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Thread */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2.5 min-h-[160px]">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-600 py-8">
              <MessageSquare size={26} />
              <p className="text-xs text-center leading-relaxed">
                No messages yet.<br />
                Your message will also be forwarded<br />
                along any outgoing connections.
              </p>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role !== 'user' && (
                  <span className="text-base shrink-0 mt-0.5">{data.icon}</span>
                )}
                <div
                  className={`max-w-[82%] px-3 py-2 rounded-xl text-sm leading-relaxed
                    ${msg.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-sm'
                      : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-sm'
                    }`}
                >
                  {/* Edge type badge for agent messages */}
                  {msg.edgeType && (
                    <span className={`
                      text-[9px] font-semibold mr-1.5 px-1 py-0.5 rounded
                      ${msg.edgeType === 'feedback'      ? 'text-orange-400 bg-orange-950' : ''}
                      ${msg.edgeType === 'conditional'   ? 'text-yellow-400 bg-yellow-950' : ''}
                      ${msg.edgeType === 'bidirectional' ? 'text-emerald-400 bg-emerald-950' : ''}
                      ${msg.edgeType === 'directional'   ? 'text-indigo-400 bg-indigo-950' : ''}
                    `}>
                      {{
                        directional:   '→',
                        feedback:      '↩',
                        conditional:   '⑂',
                        bidirectional: '↔',
                      }[msg.edgeType]}
                    </span>
                  )}
                  {msg.text}
                  <p className="text-[9px] mt-1 opacity-40 text-right">
                    {new Date(msg.ts).toLocaleTimeString()}
                  </p>
                </div>
                {msg.role === 'user' && (
                  <span className="text-base shrink-0 mt-0.5">🧑</span>
                )}
              </div>
            ))
          )}
        </div>

        {/* Input */}
        <div className="px-3 pb-3 pt-2 border-t border-slate-800 flex gap-2 shrink-0">
          <textarea
            className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2
                       text-sm text-slate-200 resize-none focus:outline-none
                       focus:ring-2 focus:ring-indigo-500 placeholder-slate-600 leading-relaxed"
            rows={2}
            placeholder={`Prompt ${data.label}… (also forwards along connections)`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
            }}
          />
          <button
            onClick={handleSend}
            disabled={!text.trim()}
            className="self-end px-3 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl
                       text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Agent Node ────────────────────────────────────────────────────────────
export default function AgentNode({ id, data, selected }) {
  const { nodes, setSelectedNode, agentMessages } = useWorkflowStore()
  const [showPopup, setShowPopup] = useState(false)

  const unread = (agentMessages?.[id] || []).filter((m) => m.role === 'agent').length

  const handleClick = () => {
    const node = nodes.find((n) => n.id === id)
    if (node) setSelectedNode(node)
  }

  return (
    <>
      <div
        onClick={handleClick}
        className="min-w-[170px] max-w-[200px] rounded-xl border-2 p-3 cursor-pointer
                   transition-all duration-150 select-none relative group"
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
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm text-slate-100 truncate">{data.label}</p>
            <p className="text-[11px] text-slate-400 truncate capitalize">
              {data.model?.split('-').slice(0, 2).join('-')}
            </p>
          </div>

          {/* Message button */}
          <button
            onClick={(e) => { e.stopPropagation(); setShowPopup(true) }}
            className="relative shrink-0 w-6 h-6 flex items-center justify-center
                       rounded-lg text-slate-500 hover:text-indigo-400
                       hover:bg-indigo-950 transition-colors"
            title="Open agent messages"
          >
            <MessageSquare size={13} />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full
                               bg-orange-500 text-white text-[8px] font-bold
                               flex items-center justify-center leading-none">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>
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

      {showPopup && (
        <AgentMessagePopup
          nodeId={id}
          data={data}
          onClose={() => setShowPopup(false)}
        />
      )}
    </>
  )
}
