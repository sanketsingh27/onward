import { auth } from '@clerk/nextjs/server'
import { Dashboard } from '@/components/Dashboard'

export default async function Home() {
  await auth.protect({ unauthenticatedUrl: '/sign-in' })
  return <Dashboard />
}
