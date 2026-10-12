import { SignUp } from '@clerk/nextjs'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { AuthShell } from '@/components/AuthShell'

export default async function SignUpPage() {
  const { isAuthenticated } = await auth()

  if (isAuthenticated) redirect('/')

  return (
    <AuthShell>
      <SignUp fallbackRedirectUrl="/" signInFallbackRedirectUrl="/" />
    </AuthShell>
  )
}
