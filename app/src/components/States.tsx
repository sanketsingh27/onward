'use client'
import { motion } from 'framer-motion'
import { Crosshair, WarningCircle, X } from '@phosphor-icons/react'
import type { TabId } from '@/lib/openings'

const EMPTY_COPY: Record<TabId, { title: string; body: string }> = {
  all: { title: 'No current recommendations', body: 'Update your profile or refresh recommendations to see the latest matches.' },
  saved: { title: 'Nothing saved yet', body: 'Bookmark the openings worth a second look and they will collect here.' },
  applied: { title: 'Nothing applied yet', body: 'Applied openings remain here for your record.' },
  dismissed: { title: 'Nothing dismissed', body: 'Dismissed openings remain here for your record.' },
}

export function Skeletons({ count = 5 }: { count?: number }) {
  return (
    <div className="divide-y divide-slate-200/70">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-6 px-6 py-6 md:px-8">
          <div className="flex-1 space-y-2.5">
            <motion.div
              animate={{ opacity: [0.45, 0.9, 0.45] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.08 }}
              className="h-3.5 w-2/5 rounded-md bg-slate-200/80"
            />
            <motion.div
              animate={{ opacity: [0.45, 0.9, 0.45] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.08 + 0.05 }}
              className="h-3 w-1/3 rounded-md bg-slate-200/60"
            />
          </div>
          <motion.div
            animate={{ opacity: [0.45, 0.9, 0.45] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.08 }}
            className="h-8 w-24 rounded-lg bg-slate-200/70"
          />
        </div>
      ))}
    </div>
  )
}


export function EmptyFiltered({ tab }: { tab: TabId }) {
  const copy = EMPTY_COPY[tab]
  return (
    <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-2xl border border-slate-200 bg-white">
        <Crosshair size={22} weight="duotone" className="text-slate-300" />
      </div>
      <h2 className="mt-5 text-[15px] font-semibold tracking-tight text-slate-900">{copy.title}</h2>
      <p className="mt-1.5 max-w-[40ch] text-sm text-slate-500">{copy.body}</p>
    </div>
  )
}

export function ErrorBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="mx-6 mt-6 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 md:mx-8">
      <WarningCircle size={18} weight="fill" className="mt-0.5 shrink-0 text-rose-500" />
      <p className="flex-1 text-[13px] leading-relaxed text-rose-700">
        Recommendations could not be loaded. Refresh to retry.
      </p>
      <button onClick={onDismiss} className="shrink-0 text-rose-400 transition-colors hover:text-rose-600" aria-label="Dismiss">
        <X size={16} weight="bold" />
      </button>
    </div>
  )
}
