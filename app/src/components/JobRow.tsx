'use client'
import { motion } from 'framer-motion'
import { Bookmark, Check, X as XIcon } from '@phosphor-icons/react'
import { compLabel, type Opening, type OpeningState } from '@/lib/openings'

function StateToggle({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean
  onClick: () => void
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={`grid h-8 w-8 place-items-center rounded-lg border transition-colors ${
        active
          ? 'border-emerald-500/40 bg-emerald-50 text-emerald-600'
          : 'border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600'
      }`}
    >
      {children}
    </button>
  )
}

export function JobRow({
  opening,
  rank,
  state,
  onState,
}: {
  opening: Opening
  rank: number
  state: OpeningState
  onState: (id: string, state: OpeningState) => void
}) {
  return (
    <motion.article
      layout
      variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}
      transition={{ type: 'spring', stiffness: 100, damping: 20 }}
      className="group grid grid-cols-12 items-center gap-x-6 gap-y-4 px-6 py-6 transition-colors hover:bg-slate-50/60 md:px-8"
    >
      <div className="col-span-12 lg:col-span-5">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-[11px] tabular-nums text-slate-400">{String(rank).padStart(2, '0')}</span>
          <div className="min-w-0">
            <h3 className="truncate text-[15px] font-semibold tracking-tight text-slate-900">{opening.title}</h3>
            <p className="mt-0.5 text-[13px] text-slate-500">
              {opening.company}
              <span className="mx-1.5 text-slate-300">·</span>
              {opening.location}
            </p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-slate-200 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">{opening.remote}</span>
          <span className="rounded-full border border-slate-200 px-2.5 py-0.5 text-[11px] text-slate-500">{compLabel(opening)}</span>
        </div>
      </div>

      <div className="col-span-12 lg:col-span-4">
        <div className="flex items-end gap-2">
          <span className="text-3xl font-semibold tracking-tight text-emerald-600 tabular-nums">{opening.fit}</span>
          <span className="pb-1 text-[12px] text-slate-400">/100 fit</span>
        </div>
      </div>

      <div className="col-span-12 flex items-center justify-between gap-4 lg:col-span-3 lg:flex-col lg:items-end">
        {opening.reason && (
          <p className="max-w-[34ch] text-[13px] leading-relaxed text-slate-500 lg:text-right">{opening.reason}</p>
        )}
        <div className="flex items-center gap-2">
          <a
            href={opening.applyUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-[13px] font-medium text-white transition-all hover:bg-emerald-700 active:translate-y-px"
          >
            Apply
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M3.5 8.5 8.5 3.5M4.5 3.5h4v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
          <StateToggle active={state === 'saved'} onClick={() => onState(opening.id, state === 'saved' ? null : 'saved')} title="Save">
            <Bookmark size={15} weight={state === 'saved' ? 'fill' : 'regular'} />
          </StateToggle>
          <StateToggle active={state === 'applied'} onClick={() => onState(opening.id, state === 'applied' ? null : 'applied')} title="Mark applied">
            <Check size={15} weight={state === 'applied' ? 'bold' : 'regular'} />
          </StateToggle>
          <StateToggle active={state === 'dismissed'} onClick={() => onState(opening.id, state === 'dismissed' ? null : 'dismissed')} title="Dismiss">
            <XIcon size={15} weight={state === 'dismissed' ? 'bold' : 'regular'} />
          </StateToggle>
        </div>
      </div>
    </motion.article>
  )
}
