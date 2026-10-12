import { SignIn } from '@clerk/nextjs'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { AuthShell } from '@/components/AuthShell'

export default async function SignInPage() {
  const { isAuthenticated } = await auth()

  if (isAuthenticated) redirect('/')

  return (
    <AuthShell>
      <SignIn fallbackRedirectUrl="/" signUpFallbackRedirectUrl="/" withSignUp />
    </AuthShell>
  )
}
