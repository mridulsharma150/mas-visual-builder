import { BaseEdge, EdgeLabelRenderer, getBezierPath } from '@xyflow/react'

// ── SVG Arrow Marker Defs (inject once into the canvas SVG) ──────────────
export function EdgeMarkerDefs() {
  return (
    <svg style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}>
      <defs>
        <marker id="arrow-dir" markerWidth="8" markerHeight="8"
          refX="7" refY="3" orient="auto" markerUnits="strokeWidth">
          <path d="M0,0 L0,6 L8,3 z" fill="#6366f1" />
        </marker>
        <marker id="arrow-feed" markerWidth="8" markerHeight="8"
          refX="7" refY="3" orient="auto" markerUnits="strokeWidth">
          <path d="M0,0 L0,6 L8,3 z" fill="#f97316" />
        </marker>
        <marker id="arrow-cond" markerWidth="8" markerHeight="8"
          refX="7" refY="3" orient="auto" markerUnits="strokeWidth">
          <path d="M0,0 L0,6 L8,3 z" fill="#eab308" />
        </marker>
        <marker id="arrow-bidi" markerWidth="8" markerHeight="8"
          refX="1" refY="3" orient="auto-start-reverse" markerUnits="strokeWidth">
          <path d="M0,0 L0,6 L8,3 z" fill="#10b981" />
        </marker>
      </defs>
    </svg>
  )
}

// ── Edge type metadata (used by selector UI too) ─────────────────────────
export const EDGE_TYPE_META = {
  directional: {
    label: 'Directional',
    description: 'One-way flow — passes output downstream',
    color: '#6366f1',
    icon: '→',
    stroke: 2,
    dasharray: 'none',
    markerEnd: 'url(#arrow-dir)',
    markerStart: undefined,
    animated: true,
  },
  feedback: {
    label: 'Feedback',
    description: 'Returns a critique or correction upstream',
    color: '#f97316',
    icon: '↩',
    stroke: 2,
    dasharray: '7 4',
    markerEnd: 'url(#arrow-feed)',
    markerStart: undefined,
    animated: true,
  },
  conditional: {
    label: 'Conditional',
    description: 'Branch taken only when condition is met',
    color: '#eab308',
    icon: '⑂',
    stroke: 2,
    dasharray: '4 3',
    markerEnd: 'url(#arrow-cond)',
    markerStart: undefined,
    animated: true,
  },
  bidirectional: {
    label: 'Bidirectional',
    description: 'Agents share context freely in both directions',
    color: '#10b981',
    icon: '↔',
    stroke: 2,
    dasharray: 'none',
    markerEnd: 'url(#arrow-bidi)',
    markerStart: 'url(#arrow-bidi)',
    animated: true,
  },
}

// ── Generic edge renderer used by all four types ─────────────────────────
function MASEdge({ id, sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition, data, selected, edgeType }) {
  const meta = EDGE_TYPE_META[edgeType] || EDGE_TYPE_META.directional
  const [edgePath, labelX, labelY] = getBezierPath(
    { sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition }
  )
  const color = selected ? '#fff' : meta.color

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: color,
          strokeWidth: selected ? meta.stroke + 1 : meta.stroke,
          strokeDasharray: meta.dasharray === 'none' ? undefined : meta.dasharray,
          markerEnd: meta.markerEnd,
          markerStart: meta.markerStart,
          filter: selected ? `drop-shadow(0 0 4px ${meta.color})` : undefined,
          transition: 'stroke 150ms, stroke-width 150ms',
        }}
      />

      {/* Floating type badge */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'none',
          }}
          className="flex items-center gap-1"
        >
          <span
            className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full border"
            style={{
              color: meta.color,
              borderColor: `${meta.color}55`,
              background: '#0f172a',
              opacity: selected ? 1 : 0.75,
            }}
          >
            {meta.icon} {meta.label}
          </span>

          {/* Show condition label if set */}
          {edgeType === 'conditional' && data?.condition && (
            <span
              className="text-[9px] font-mono px-1.5 py-0.5 rounded border"
              style={{ color: '#eab308', borderColor: '#eab30855', background: '#0f172a' }}
            >
              if: {data.condition}
            </span>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  )
}

// ── Four named exports that React Flow needs ─────────────────────────────
export function DirectionalEdge(props) {
  return <MASEdge {...props} edgeType="directional" />
}
export function FeedbackEdge(props) {
  return <MASEdge {...props} edgeType="feedback" />
}
export function ConditionalEdge(props) {
  return <MASEdge {...props} edgeType="conditional" />
}
export function BidirectionalEdge(props) {
  return <MASEdge {...props} edgeType="bidirectional" />
}
