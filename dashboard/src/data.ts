export type JobState = 'shortlist' | 'applied' | 'dismissed' | null

export interface Breakdown {
  skill: number
  experience: number
  seniority: number
}

export interface Job {
  id: string
  company: string
  title: string
  location: string
  remote: 'Remote' | 'Hybrid' | 'Onsite'
  comp: string
  confidence: number
  breakdown: Breakdown
  reason: string
  applyUrl: string
  state: JobState
}

// fit = 0.60·skill + 0.25·experience + 0.15·seniority (per the scoring-pipeline decision)
export const fitOf = (b: Breakdown) =>
  Math.round(0.6 * b.skill + 0.25 * b.experience + 0.15 * b.seniority)

export const JOBS: Job[] = [
  {
    id: 'openai-1',
    company: 'OpenAI',
    title: 'Senior Software Engineer, Applied Engineering',
    location: 'San Francisco, CA',
    remote: 'Remote',
    comp: '$290K – $410K · equity',
    confidence: 0.93,
    breakdown: { skill: 95, experience: 88, seniority: 82 },
    reason: 'Eleven of your twelve core skills map; the one miss is the security-review requirement.',
    applyUrl: 'https://jobs.ashbyhq.com/openai/apply',
    state: null,
  },
  {
    id: 'snowflake-1',
    company: 'Snowflake',
    title: 'Principal Software Engineer, Snowpark',
    location: 'Remote (US)',
    remote: 'Remote',
    comp: '$230K – $330K · RSUs',
    confidence: 0.9,
    breakdown: { skill: 90, experience: 84, seniority: 86 },
    reason: 'Snowpark internals match your query-engine work; the title sits one notch above senior.',
    applyUrl: 'https://jobs.ashbyhq.com/snowflake/apply',
    state: null,
  },
  {
    id: 'crusoe-1',
    company: 'Crusoe',
    title: 'Staff Software Engineer, Platform',
    location: 'San Francisco, CA',
    remote: 'Hybrid',
    comp: '$200K – $260K · equity',
    confidence: 0.88,
    breakdown: { skill: 86, experience: 78, seniority: 78 },
    reason: 'Platform infra for AI clusters is your lane; equity-heavy comp is the only soft spot.',
    applyUrl: 'https://jobs.ashbyhq.com/crusoe/apply',
    state: null,
  },
  {
    id: 'airwallex-1',
    company: 'Airwallex',
    title: 'Senior Product Engineer, Payments',
    location: 'Singapore',
    remote: 'Hybrid',
    comp: 'S$180K – S$240K',
    confidence: 0.84,
    breakdown: { skill: 76, experience: 72, seniority: 70 },
    reason: 'Payments domain is new to you, but the product-engineering loop is a clean fit.',
    applyUrl: 'https://jobs.ashbyhq.com/airwallex/apply',
    state: null,
  },
  {
    id: 'neura-1',
    company: 'Neura Robotics',
    title: 'Senior ML Engineer, Embodied AI',
    location: 'Metzingen, Germany',
    remote: 'Onsite',
    comp: '€95K – €130K',
    confidence: 0.8,
    breakdown: { skill: 68, experience: 66, seniority: 74 },
    reason: 'Embodied AI is adjacent rather than core; the robotics context would be a ramp.',
    applyUrl: 'https://jobs.ashbyhq.com/neura-robotics-gmbh/apply',
    state: null,
  },
  {
    id: 'lilt-1',
    company: 'Lilt',
    title: 'Senior Frontend Engineer',
    location: 'Remote (US)',
    remote: 'Remote',
    comp: '$170K – $215K',
    confidence: 0.79,
    breakdown: { skill: 60, experience: 66, seniority: 62 },
    reason: 'Frontend-heavy role; your strength is full-stack, so it is only a partial match.',
    applyUrl: 'https://jobs.ashbyhq.com/lilt-production/apply',
    state: null,
  },
  {
    id: 'alpaca-1',
    company: 'Alpaca Health',
    title: 'Senior Full-Stack Engineer',
    location: 'New York, NY',
    remote: 'Hybrid',
    comp: '$185K – $225K',
    confidence: 0.77,
    breakdown: { skill: 55, experience: 60, seniority: 58 },
    reason: 'TypeScript stack matches, but the clinical domain context is thin.',
    applyUrl: 'https://jobs.ashbyhq.com/alpacahealth/apply',
    state: null,
  },
  {
    id: 'renuity-1',
    company: 'Renuity',
    title: 'Lead Software Engineer',
    location: 'Remote (US)',
    remote: 'Remote',
    comp: '$160K – $200K',
    confidence: 0.74,
    breakdown: { skill: 48, experience: 58, seniority: 54 },
    reason: 'Lead role wants 10+ years and people management; you are at 7 and IC-leaning.',
    applyUrl: 'https://jobs.ashbyhq.com/renuity/apply',
    state: null,
  },
]

export type TabId = 'all' | 'shortlist' | 'applied' | 'dismissed'

export const TABS: { id: TabId; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'shortlist', label: 'Shortlist' },
  { id: 'applied', label: 'Applied' },
  { id: 'dismissed', label: 'Dismissed' },
]
