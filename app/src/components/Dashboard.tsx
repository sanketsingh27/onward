'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { TABS, type Opening, type OpeningState, type TabId } from '@/lib/openings'
import { fetchOpenings, fetchState, pollScan, setOpeningState, startScan } from '@/lib/api'
import { Sidebar } from './Sidebar'
import { CommandInput } from './CommandInput'
import { JobRow } from './JobRow'
import { EmptyFiltered, EmptyIdle, ErrorBanner, Skeletons } from './States'

type ScanStatus = 'idle' | 'loading' | 'ready'

export function Dashboard() {
  const [openings, setOpenings] = useState<Opening[]>([])
  const [states, setStates] = useState<Record<string, OpeningState>>({})
  const [tab, setTab] = useState<TabId>('all')
  const [status, setStatus] = useState<ScanStatus>('idle')
  const [error, setError] = useState(false)

  const refresh = useCallback(async () => {
    const [list, rows] = await Promise.all([fetchOpenings(), fetchState()])
    setOpenings(list)
    const map: Record<string, OpeningState> = {}
    for (const r of rows) map[r.opening_id] = r.status
    setStates(map)
    setStatus(list.length ? 'ready' : 'idle')
  }, [])

  useEffect(() => {
    refresh().catch(() => setError(true))
  }, [refresh])

  const visible = useMemo(() => {
    const filtered = tab === 'all' ? openings : openings.filter((o) => states[o.id] === tab)
    return [...filtered].sort((a, b) => b.fit - a.fit)
  }, [openings, states, tab])

  const counts = useMemo(
    () => ({
      all: openings.length,
      saved: openings.filter((o) => states[o.id] === 'saved').length,
      applied: openings.filter((o) => states[o.id] === 'applied').length,
      dismissed: openings.filter((o) => states[o.id] === 'dismissed').length,
    }),
    [openings, states],
  )

  async function runScan() {
    setError(false)
    setStatus('loading')
    try {
      const { jobId } = await startScan()
      for (;;) {
        await new Promise((r) => setTimeout(r, 1500))
        const s = await pollScan(jobId)
        if (s.status === 'done' || s.status === 'error') break
      }
      await refresh()
    } catch {
      setError(true)
      setStatus('idle')
    }
  }

  async function setState(id: string, state: OpeningState) {
    setStates((p) => {
      const n = { ...p }
      if (state === null) delete n[id]
      else n[id] = state
      return n
    })
    if (state === null) return
    try {
      await setOpeningState(id, state)
    } catch {
      setError(true)
    }
  }

  return (
    <div className="flex min-h-[100dvh] flex-col lg:flex-row">
      <Sidebar scanning={status === 'loading'} onScan={runScan} />
      <main className="flex-1">
        <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-slate-50/80 backdrop-blur-md">
          <div className="flex flex-col gap-3 px-6 py-4 md:flex-row md:items-center md:justify-between md:px-8">
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-slate-900">Openings</h1>
              <p className="mt-0.5 text-[13px] text-slate-500">ranked by fit against your profile</p>
            </div>
            <div className="w-full md:w-80">
              <CommandInput />
            </div>
          </div>
          <div className="flex items-center gap-1 px-6 pb-3 md:px-8">
            <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
              {TABS.map((t) => {
                const active = tab === t.id
                return (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`relative rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors ${
                      active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {t.label}
                    <span className="ml-1.5 text-[11px] tabular-nums text-slate-400">{counts[t.id]}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </header>

        {error && <ErrorBanner onDismiss={() => setError(false)} />}

        <div className="mx-auto max-w-[1400px]">
          {status === 'idle' && <EmptyIdle onScan={runScan} />}
          {status === 'loading' && <Skeletons />}
          {status === 'ready' &&
            (visible.length === 0 ? (
              <EmptyFiltered tab={tab} />
            ) : (
              <motion.div
                initial="hidden"
                animate="show"
                variants={{ show: { transition: { staggerChildren: 0.06 } } }}
                className="divide-y divide-slate-200/70"
              >
                <AnimatePresence mode="popLayout" initial={false}>
                  {visible.map((o, i) => (
                    <JobRow key={o.id} opening={o} rank={i + 1} state={states[o.id] ?? null} onState={setState} />
                  ))}
                </AnimatePresence>
              </motion.div>
            ))}
        </div>
      </main>
    </div>
  )
}
