'use client'
import { useState } from 'react'
import type { Profile } from '@/lib/api'

const DEFAULT_FILTERS: Profile['filters'] = {
  remote: 'Remote only',
  locations: ['Remote'],
  compFloorUsd: 0,
  compFloorInr: 0,
  employmentType: 'Full-time',
  seniority: 'Senior+',
  excludeTerms: [],
}

type ProfileEditorProps = {
  profile: Profile | null
  isSaving: boolean
  error: string | null
  onCancel: () => void
  onSave: (profile: Profile) => void
}

export function ProfileEditor({ profile, isSaving, error, onCancel, onSave }: ProfileEditorProps) {
  const [resume, setResume] = useState(profile?.resume ?? '')
  const [filters, setFilters] = useState(profile?.filters ?? DEFAULT_FILTERS)

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSave({ resume, filters })
  }

  return (
    <section className="mx-auto max-w-3xl px-6 py-10 md:px-8 md:py-14" aria-labelledby="profile-heading">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Your matching profile</p>
          <h2 id="profile-heading" className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
            {profile ? 'Update your profile' : 'Set up your profile'}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Your resume and preferences determine which openings are recommended to you.
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={submit}>
          <div>
            <label htmlFor="resume" className="text-sm font-medium text-slate-800">Resume</label>
            <textarea
              id="resume"
              required
              value={resume}
              onChange={(event) => setResume(event.target.value)}
              rows={9}
              placeholder="Paste your resume or a concise summary of your experience."
              className="mt-2 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm leading-6 text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="remote" className="text-sm font-medium text-slate-800">Work arrangement</label>
              <select
                id="remote"
                value={filters.remote}
                onChange={(event) => setFilters({ ...filters, remote: event.target.value as Profile['filters']['remote'] })}
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              >
                <option>Remote only</option>
                <option>Hybrid ok</option>
                <option>Onsite ok</option>
              </select>
            </div>
            <div>
              <label htmlFor="locations" className="text-sm font-medium text-slate-800">Locations</label>
              <input
                id="locations"
                value={filters.locations.join(', ')}
                onChange={(event) => setFilters({ ...filters, locations: event.target.value.split(',').map((location) => location.trim()).filter(Boolean) })}
                placeholder="Remote, New York"
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              />
            </div>
            <div>
              <label htmlFor="comp-usd" className="text-sm font-medium text-slate-800">Minimum compensation (USD)</label>
              <input
                id="comp-usd"
                type="number"
                min="0"
                value={filters.compFloorUsd}
                onChange={(event) => setFilters({ ...filters, compFloorUsd: event.target.valueAsNumber || 0 })}
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              />
            </div>
            <div>
              <label htmlFor="comp-inr" className="text-sm font-medium text-slate-800">Minimum compensation (INR)</label>
              <input
                id="comp-inr"
                type="number"
                min="0"
                value={filters.compFloorInr}
                onChange={(event) => setFilters({ ...filters, compFloorInr: event.target.valueAsNumber || 0 })}
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              />
            </div>
            <div>
              <label htmlFor="employment-type" className="text-sm font-medium text-slate-800">Employment type</label>
              <select
                id="employment-type"
                value={filters.employmentType}
                onChange={(event) => setFilters({ ...filters, employmentType: event.target.value as Profile['filters']['employmentType'] })}
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              >
                <option>Full-time</option>
                <option>Contract</option>
              </select>
            </div>
            <div>
              <label htmlFor="seniority" className="text-sm font-medium text-slate-800">Seniority</label>
              <select
                id="seniority"
                value={filters.seniority}
                onChange={(event) => setFilters({ ...filters, seniority: event.target.value as Profile['filters']['seniority'] })}
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              >
                <option>Mid</option>
                <option>Senior</option>
                <option>Senior+</option>
                <option>Staff+</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="exclude-terms" className="text-sm font-medium text-slate-800">Exclude terms</label>
            <input
              id="exclude-terms"
              value={filters.excludeTerms.join(', ')}
              onChange={(event) => setFilters({ ...filters, excludeTerms: event.target.value.split(',').map((term) => term.trim()).filter(Boolean) })}
              placeholder="visa sponsorship, security clearance"
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            />
            <p className="mt-2 text-xs leading-5 text-slate-500">Comma-separated terms are flagged in matching openings.</p>
          </div>

          {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

          <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-5">
            {profile && <button type="button" onClick={onCancel} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900">Cancel</button>}
            <button type="submit" disabled={isSaving} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60">
              {isSaving ? 'Saving…' : 'Save profile'}
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}
