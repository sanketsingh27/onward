import { createClerkClient } from '../worker/node_modules/@clerk/backend/dist/index.js'
import { getOrCreateResumeEmbedding } from '../worker/src/embed/embed.ts'
import { profileInputSchema, type ProfileInput } from '../worker/src/api/schemas.ts'

export type DevelopmentProfileEnvironment = Parameters<typeof getOrCreateResumeEmbedding>[0]

type DevelopmentAccount = {
  id: string
  email: string
  name: string
}

type ProfileBootstrapOptions = {
  env: DevelopmentProfileEnvironment
  resume: string
  resolveAccount: (email: string) => Promise<DevelopmentAccount>
}

const demoFilters: ProfileInput['filters'] = {
  remote: 'Remote only',
  locations: [],
  compFloorUsd: 0,
  compFloorInr: 0,
  employmentType: 'Full-time',
  seniority: 'Senior+',
  excludeTerms: [],
}

function resumeContact(resume: string) {
  const lines = resume.split(/\r?\n/, 3).map((line) => line.trim()).filter(Boolean)
  const contact = lines.slice(0, 3).join(' ')
  const emails = new Set(contact.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)?.map((email) => email.toLowerCase()))
  if (emails.size !== 1) {
    throw new Error('Profile bootstrap input stage failed: the Resume contact header must contain one email address.')
  }
  const email = [...emails][0]
  let name = lines[0].split('|')[0].split(/\bLinkedIn\b/i)[0].replace(/^#+\s*/, '').trim()
  if (name.toLowerCase().includes(email)) name = lines[1] ?? ''
  if (!name) throw new Error('Profile bootstrap input stage failed: the Resume contact header must include a name.')
  return { email, name }
}

export async function bootstrapDevelopmentProfile({ env, resume, resolveAccount }: ProfileBootstrapOptions) {
  const parsed = profileInputSchema.safeParse({ resume, filters: demoFilters })
  if (!parsed.success) throw new Error('Profile bootstrap input stage failed: the Resume is empty or invalid.')

  await env.APP_DB.prepare('CREATE TABLE IF NOT EXISTS development_bootstrap_owner (name TEXT PRIMARY KEY, user_id TEXT NOT NULL)').run()
  const mapped = await env.APP_DB.prepare("SELECT user_id FROM development_bootstrap_owner WHERE name = 'profile'").first<{ user_id: string }>()
  let account = mapped
    ? await env.APP_DB.prepare('SELECT id, email, name FROM users WHERE id = ?').bind(mapped.user_id).first<DevelopmentAccount>()
    : null
  if (!account) {
    const { email, name } = resumeContact(parsed.data.resume)
    account = await resolveAccount(email)
    if (!account.id || account.email.toLowerCase() !== email) {
      throw new Error('Profile bootstrap identity stage failed: the resolved Clerk account does not match the Resume email.')
    }
    // Verify identity before adopting an existing local row: an old numeric row is not a Clerk account.
    await env.APP_DB.prepare('INSERT OR IGNORE INTO users (id, email, name) VALUES (?, ?, ?)')
      .bind(account.id, email, name).run()
    await env.APP_DB.prepare("INSERT OR REPLACE INTO development_bootstrap_owner (name, user_id) VALUES ('profile', ?)")
      .bind(account.id).run()
  }

  const profile = await env.APP_DB.prepare('SELECT resume FROM profile WHERE user_id = ?')
    .bind(account.id).first<{ resume: string }>()
  if (!profile) {
    await env.APP_DB.prepare('INSERT INTO profile (user_id, resume, filters) VALUES (?, ?, ?)')
      .bind(account.id, parsed.data.resume, JSON.stringify(demoFilters)).run()
  }

  await getOrCreateResumeEmbedding(env, account.id, profile?.resume ?? parsed.data.resume)
  return { userId: account.id }
}

export async function resolveDevelopmentClerkAccount(secretKey: string | undefined, email: string): Promise<DevelopmentAccount> {
  if (!secretKey) throw new Error('Profile bootstrap identity stage failed: CLERK_SECRET_KEY is missing from app/.env.local.')
  const clerk = createClerkClient({ secretKey })
  const users = await clerk.users.getUserList({ emailAddress: [email], limit: 2 })
    .catch(() => { throw new Error('Profile bootstrap identity stage failed: Clerk lookup could not be completed.') })
  const matches = users.data.filter((user) => user.emailAddresses.some((address) => address.emailAddress.toLowerCase() === email))
  if (matches.length !== 1) {
    throw new Error(matches.length === 0
      ? 'Profile bootstrap identity stage failed: no Clerk account matches the Resume email.'
      : 'Profile bootstrap identity stage failed: more than one Clerk account matches the Resume email.')
  }
  const user = matches[0]
  return { id: user.id, email, name: [user.firstName, user.lastName].filter(Boolean).join(' ') }
}
