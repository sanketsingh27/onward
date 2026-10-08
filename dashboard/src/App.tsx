import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { JOBS, TABS, fitOf, type Job, type TabId } from './data'
import { Sidebar } from './components/Sidebar'
import { CommandInput } from './components/CommandInput'
import { JobRow } from './components/JobRow'
import { EmptyFiltered, EmptyIdle, EmptySearch, ErrorBanner, Skeletons } from './components/States'

type ScanStatus = 'idle' | 'loading' | 'ready'

export default function App() {
  const [jobs, setJobs] = useState<Job[]>(JOBS)
  const [tab, setTab] = useState<TabId>('all')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<ScanStatus>('idle')
  const [error, setError] = useState(false)

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = jobs.filter((j) => {
      if (tab !== 'all' && j.state !== tab) return false
      if (!q) return true
      const haystack = [j.company, j.title, j.location, j.remote, j.comp]
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
    return [...filtered].sort((a, b) => fitOf(b.breakdown) - fitOf(a.breakdown))
  }, [jobs, tab, query])

  const counts = useMemo(
    () => ({
      all: jobs.length,
      shortlist: jobs.filter((j) => j.state === 'shortlist').length,
      applied: jobs.filter((j) => j.state === 'applied').length,
      dismissed: jobs.filter((j) => j.state === 'dismissed').length,
    }),
    [jobs],
  )

  function runScan() {
    setError(false)
    setStatus('loading')
    window.setTimeout(() => setStatus('ready'), 1300)
  }

  function setState(id: string, state: Job['state']) {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, state } : j)))
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
              <CommandInput value={query} onChange={setQuery} />
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
              query.trim() ? (
                <EmptySearch query={query.trim()} />
              ) : (
                <EmptyFiltered tab={tab} />
              )
            ) : (
              <motion.div
                initial="hidden"
                animate="show"
                variants={{ show: { transition: { staggerChildren: 0.06 } } }}
                className="divide-y divide-slate-200/70"
              >
                <AnimatePresence mode="popLayout" initial={false}>
                  {visible.map((job, i) => (
                    <JobRow key={job.id} job={job} rank={i + 1} onState={setState} />
                  ))}
                </AnimatePresence>
              </motion.div>
            ))}
        </div>
      </main>
    </div>
  )
}
