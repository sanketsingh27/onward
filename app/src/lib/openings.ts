export type Opening = {
  id: string
  board: string
  company: string
  title: string
  location: string
  secondaryLocations: string[]
  remote: 'Remote' | 'Hybrid' | 'Onsite'
  compensation: {
    currency: string
    salaryMin: number
    salaryMax: number
    equityMin?: number
    equityMax?: number
    bonus?: boolean
  }
  employmentType: 'FullTime' | 'Contract'
  publishedAt: string
  applyUrl: string
  descriptionPlain: string
  fit: number
  reason?: string
}

export type OpeningState = 'saved' | 'applied' | 'dismissed' | null

export type TabId = 'all' | 'saved' | 'applied' | 'dismissed'

export const TABS: { id: TabId; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'saved', label: 'Saved' },
  { id: 'applied', label: 'Applied' },
  { id: 'dismissed', label: 'Dismissed' },
]

const k = (n: number) => (n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : `${Math.round(n / 1000)}K`)
const sym = (currency: string) =>
  ({ INR: '₹', SGD: 'S$', EUR: '€' } as Record<string, string>)[currency] ?? '$'

export function compLabel(o: Opening): string {
  const { currency, salaryMin, salaryMax, equityMin, bonus } = o.compensation
  if (salaryMax === 0) return 'comp not listed'
  let s = `${sym(currency)}${k(salaryMin)} – ${sym(currency)}${k(salaryMax)}`
  if (equityMin) s += ' · equity'
  if (bonus) s += ' · bonus'
  return s
}
