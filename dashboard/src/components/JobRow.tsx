import { motion } from 'framer-motion'
import { Bookmark, Check, X as XIcon } from '@phosphor-icons/react'
import { fitOf, type Job } from '../data'

interface Props {
  job: Job
  rank: number
  onState: (id: string, state: Job['state']) => void
}

const SEGMENTS = [
  { key: 'skill', label: 'skill', color: 'bg-emerald-500' },
  { key: 'experience', label: 'experience', color: 'bg-slate-400' },
  { key: 'seniority', label: 'seniority', color: 'bg-slate-300' },
] as const

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

export function JobRow({ job, rank, onState }: Props) {
  const b = job.breakdown
  const total = b.skill + b.experience + b.seniority
  const confidencePct = Math.round(job.confidence * 100)
  const fit = fitOf(b)

  return (
    <motion.article
      layout
      variants={{
        hidden: { opacity: 0, y: 14 },
        show: { opacity: 1, y: 0 },
      }}
      transition={{ type: 'spring', stiffness: 100, damping: 20 }}
      className="group grid grid-cols-12 items-center gap-x-6 gap-y-4 px-6 py-6 transition-colors hover:bg-slate-50/60 md:px-8"
    >
      {/* identity */}
      <div className="col-span-12 lg:col-span-5">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-[11px] tabular-nums text-slate-400">
            {String(rank).padStart(2, '0')}
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-[15px] font-semibold tracking-tight text-slate-900">
              {job.title}
            </h3>
            <p className="mt-0.5 text-[13px] text-slate-500">
              {job.company}
              <span className="mx-1.5 text-slate-300">·</span>
              {job.location}
            </p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-slate-200 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
            {job.remote}
          </span>
          <span className="rounded-full border border-slate-200 px-2.5 py-0.5 text-[11px] text-slate-500">
            {job.comp}
          </span>
        </div>
      </div>

      {/* fit score + breakdown */}
      <div className="col-span-12 lg:col-span-4">
        <div className="flex items-end gap-2">
          <span className="text-3xl font-semibold tracking-tight text-emerald-600 tabular-nums">
            {fit}
          </span>
          <span className="pb-1 text-[12px] text-slate-400">/100 fit</span>
          <span className="ml-auto pb-1 text-[11px] text-slate-400">{confidencePct}% confident</span>
        </div>
        <div className="mt-2 flex h-1.5 w-full gap-0.5 overflow-hidden rounded-full">
          {SEGMENTS.map((s) => (
            <motion.div
              key={s.key}
              initial={{ width: 0 }}
              animate={{ width: `${(b[s.key] / total) * 100}%` }}
              transition={{ type: 'spring', stiffness: 90, damping: 22, delay: 0.15 }}
              className={`${s.color} rounded-full`}
            />
          ))}
        </div>
        <div className="mt-1.5 flex gap-3 text-[11px] text-slate-400">
          {SEGMENTS.map((s) => (
            <span key={s.key} className="flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${s.color}`} />
              {s.label} {b[s.key]}
            </span>
          ))}
        </div>
      </div>

      {/* reason + actions */}
      <div className="col-span-12 flex items-center justify-between gap-4 lg:col-span-3 lg:flex-col lg:items-end">
        <p className="max-w-[34ch] text-[13px] leading-relaxed text-slate-500 lg:text-right">
          {job.reason}
        </p>
        <div className="flex items-center gap-2">
          <a
            href={job.applyUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-[13px] font-medium text-white transition-all hover:bg-emerald-700 active:translate-y-px"
          >
            Apply
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M3.5 8.5 8.5 3.5M4.5 3.5h4v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
          <StateToggle
            active={job.state === 'shortlist'}
            onClick={() => onState(job.id, job.state === 'shortlist' ? null : 'shortlist')}
            title="Shortlist"
          >
            <Bookmark size={15} weight={job.state === 'shortlist' ? 'fill' : 'regular'} />
          </StateToggle>
          <StateToggle
            active={job.state === 'applied'}
            onClick={() => onState(job.id, job.state === 'applied' ? null : 'applied')}
            title="Mark applied"
          >
            <Check size={15} weight={job.state === 'applied' ? 'bold' : 'regular'} />
          </StateToggle>
          <StateToggle
            active={job.state === 'dismissed'}
            onClick={() => onState(job.id, job.state === 'dismissed' ? null : 'dismissed')}
            title="Dismiss"
          >
            <XIcon size={15} weight={job.state === 'dismissed' ? 'bold' : 'regular'} />
          </StateToggle>
        </div>
      </div>
    </motion.article>
  )
}
