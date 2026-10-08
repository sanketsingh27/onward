'use client'
import { motion } from 'framer-motion'
import { ArrowRight, CaretDown } from '@phosphor-icons/react'
import { MagneticButton } from './MagneticButton'

const LABEL = 'text-[11px] font-medium uppercase tracking-wider text-slate-400'
const INPUT =
  'rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-800 placeholder:text-slate-400 outline-none transition-colors focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10'
const SELECT =
  'w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 py-2 pr-8 text-[13px] text-slate-800 outline-none transition-colors focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10'

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={LABEL}>{label}</span>
      {children}
      {hint && <span className="text-[11px] text-slate-400">{hint}</span>}
    </label>
  )
}

function Select({ value, options }: { value: string; options: string[] }) {
  return (
    <div className="relative">
      <select defaultValue={value} className={SELECT}>
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
      <CaretDown size={13} weight="bold" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
    </div>
  )
}

function StatusDot({ scanning }: { scanning: boolean }) {
  return (
    <span className="relative flex h-2 w-2">
      {scanning && (
        <motion.span
          animate={{ scale: [1, 2.4], opacity: [0.6, 0] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }}
          className="absolute inset-0 rounded-full bg-emerald-500"
        />
      )}
      <span className={`relative h-2 w-2 rounded-full ${scanning ? 'bg-emerald-500' : 'bg-slate-300'}`} />
    </span>
  )
}

export function Sidebar({ scanning, onScan }: { scanning: boolean; onScan: () => void }) {
  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-slate-200 bg-white lg:min-h-[100dvh] lg:w-80 lg:border-b-0 lg:border-r">
      <div className="flex items-center gap-2.5 px-6 pt-6">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-600">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
            <path d="M6.5 1v11M1 6.5h11" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </span>
        <span className="text-[15px] font-semibold tracking-tight text-slate-900">Onward</span>
        <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">Ashby</span>
      </div>

      <div className="mt-6 space-y-5 px-6 pb-6">
        <Field label="Remote preference">
          <Select value="Remote only" options={['Remote only', 'Hybrid ok', 'Onsite ok']} />
        </Field>
        <Field label="Locations">
          <input defaultValue="San Francisco · New York · Remote" className={INPUT} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Comp floor · USD">
            <input inputMode="numeric" defaultValue="180000" className={INPUT} />
          </Field>
          <Field label="Comp floor · INR">
            <input inputMode="numeric" defaultValue="2500000" className={INPUT} />
          </Field>
        </div>
        <Field label="Employment type">
          <Select value="Full-time" options={['Full-time', 'Contract']} />
        </Field>
        <Field label="Target seniority">
          <Select value="Senior+" options={['Mid', 'Senior', 'Senior+', 'Staff+']} />
        </Field>
        <Field label="Exclude terms" hint="flagged, not dropped">
          <input defaultValue="visa sponsorship, security clearance" className={INPUT} />
        </Field>
      </div>

      <div className="mt-auto border-t border-slate-200 px-6 py-5">
        <MagneticButton
          onClick={onScan}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
        >
          {scanning ? 'Scanning…' : 'Run scan'}
          <ArrowRight size={15} weight="bold" className={scanning ? 'opacity-0' : ''} />
        </MagneticButton>
        <div className="mt-4 flex items-center gap-2 text-[12px] text-slate-500">
          <StatusDot scanning={scanning} />
          10 boards · 7,162 openings
        </div>
      </div>
    </aside>
  )
}
