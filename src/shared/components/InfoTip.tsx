import { useId, useState } from 'react'

type Props = {
  /** Plain-language explanation shown inside the tooltip bubble. */
  text: string
  /** Subject of the tip, used to build the button's accessible label (e.g. "SPS"). */
  label?: string
  /** Horizontal anchoring of the bubble relative to the "?" trigger. */
  align?: 'center' | 'left' | 'right'
}

/**
 * Inline "?" affordance that reveals a definition on hover (desktop) and on
 * click/tap (touch + keyboard). The bubble opens above the trigger. Drop it
 * next to any label or heading that shows a technical term.
 */
export function InfoTip({ text, label, align = 'center' }: Props) {
  const tooltipId = useId()
  // Click/tap latches the bubble open (touch + keyboard); CSS handles hover.
  const [pinned, setPinned] = useState(false)

  return (
    <span className="infotip">
      <button
        type="button"
        className="infotip-trigger"
        aria-label={label ? `¿Qué significa ${label}?` : 'Más información'}
        aria-expanded={pinned}
        aria-describedby={tooltipId}
        onClick={() => setPinned((p) => !p)}
        onBlur={() => setPinned(false)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setPinned(false)
        }}
      >
        <span aria-hidden="true">?</span>
        <span className={`infotip-bubble infotip-${align}`} id={tooltipId} role="tooltip">
          {text}
        </span>
      </button>
    </span>
  )
}

export default InfoTip
