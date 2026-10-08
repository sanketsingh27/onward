import { useRef, useState } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'
import { MagnifyingGlass } from '@phosphor-icons/react'
import { useTypewriter } from '../lib/useTypewriter'

interface Props {
  value: string
  onChange: (value: string) => void
}

// The command/title-query input with a multi-step typewriter placeholder.
// The ghost text and caret show only while idle and empty; focusing reveals
// the real input. Search is wired to the parent's `value`/`onChange`.
export function CommandInput({ value, onChange }: Props) {
  const placeholder = useTypewriter()
  const [focused, setFocused] = useState(false)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const sx = useSpring(x, { stiffness: 260, damping: 18 })
  const sy = useSpring(y, { stiffness: 260, damping: 18 })
  const ref = useRef<HTMLDivElement>(null)

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const r = ref.current?.getBoundingClientRect()
    if (!r) return
    x.set((e.clientX - r.left - r.width / 2) * 0.06)
    y.set((e.clientY - r.top - r.height / 2) * 0.06)
  }

  return (
    <motion.div
      ref={ref}
      style={{ x: sx, y: sy }}
      onMouseMove={onMove}
      onMouseLeave={() => {
        x.set(0)
        y.set(0)
      }}
      className="flex items-center gap-2.5 rounded-2xl border border-slate-200/80 bg-white px-4 py-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
    >
      <MagnifyingGlass size={17} weight="regular" className="shrink-0 text-slate-400" />
      <div className="relative flex-1">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          aria-label="Search openings"
          className="w-full bg-transparent text-[13px] text-slate-700 tabular-nums outline-none"
        />
        {!focused && value === '' && (
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center text-[13px] text-slate-400">
            {placeholder}
            <span className="ml-0.5 h-4 w-px animate-pulse bg-emerald-600" />
          </span>
        )}
      </div>
    </motion.div>
  )
}
