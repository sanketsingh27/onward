'use client'
import { useAuth, UserButton } from '@clerk/nextjs'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { TABS, type Opening, type OpeningState, type TabId } from '@/lib/openings'
import { fetchOpeningHistory, fetchOpenings, fetchState, setOpeningState } from '@/lib/api'
import { Sidebar } from './Sidebar'
import { CommandInput } from './CommandInput'
import { JobRow } from './JobRow'
import { EmptyFiltered, ErrorBanner, Skeletons } from './States'

type OpeningStatus = 'loading' | 'ready'

export function Dashboard() {
  const { getToken } = useAuth()
  const [openings, setOpenings] = useState<Opening[]>([])
  const [states, setStates] = useState<Record<string, OpeningState>>({})
  const [tab, setTab] = useState<TabId>('all')
  const [status, setStatus] = useState<OpeningStatus>('loading')
  const [error, setError] = useState(false)

  const refresh = useCallback(async () => {
    setError(false)
    setStatus('loading')
    try {
      const token = await getToken()
      if (!token) throw new Error('missing session token')
      const [recommendations, history, rows] = await Promise.all([
        fetchOpenings(token),
        fetchOpeningHistory(token),
        fetchState(token),
      ])
      setOpenings([...recommendations, ...history.data])
      const map: Record<string, OpeningState> = {}
      for (const row of rows) map[row.opening_id] = row.status
      setStates(map)
    } catch {
      setError(true)
    } finally {
      setStatus('ready')
    }
  }, [getToken])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const visible = useMemo(() => {
    const filtered = tab === 'all'
      ? openings.filter((opening) => states[opening.id] !== 'applied' && states[opening.id] !== 'dismissed')
      : openings.filter((opening) => states[opening.id] === tab)
    return [...filtered].sort((a, b) => (b.fit ?? -1) - (a.fit ?? -1))
  }, [openings, states, tab])

  const counts = useMemo(
    () => ({
      all: openings.filter((opening) => states[opening.id] !== 'applied' && states[opening.id] !== 'dismissed').length,
      saved: openings.filter((opening) => states[opening.id] === 'saved').length,
      applied: openings.filter((opening) => states[opening.id] === 'applied').length,
      dismissed: openings.filter((opening) => states[opening.id] === 'dismissed').length,
    }),
    [openings, states],
  )

  async function setState(id: string, state: OpeningState) {
    setStates((p) => {
      const n = { ...p }
      if (state === null) delete n[id]
      else n[id] = state
      return n
    })
    if (state === null) return
    try {
      const token = await getToken()
      if (!token) throw new Error('missing session token')
      await setOpeningState(token, id, state)
      await refresh()
    } catch {
      setError(true)
    }
  }

  return (
    <div className="flex min-h-[100dvh] flex-col lg:flex-row">
      <Sidebar loading={status === 'loading'} onRefresh={refresh} />
      <main className="flex-1">
        <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-slate-50/80 backdrop-blur-md">
          <div className="flex flex-col gap-3 px-6 py-4 md:flex-row md:items-center md:justify-between md:px-8">
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-slate-900">Openings</h1>
              <p className="mt-0.5 text-[13px] text-slate-500">ranked by fit against your profile</p>
            </div>
            <div className="flex w-full items-center justify-between gap-4 md:w-80">
              <CommandInput />
              <UserButton />
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
