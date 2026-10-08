'use client'
import { useRef } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'
import { MagnifyingGlass } from '@phosphor-icons/react'
import { useTypewriter } from '@/lib/useTypewriter'

export function CommandInput() {
  const placeholder = useTypewriter()
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
      <MagnifyingGlass size={17} weight="regular" className="text-slate-400" />
      <span className="text-[13px] tabular-nums text-slate-700">{placeholder}</span>
      <span className="ml-0.5 h-4 w-px animate-pulse bg-emerald-600" />
    </motion.div>
  )
}
