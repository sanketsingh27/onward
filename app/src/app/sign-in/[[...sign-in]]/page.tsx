import { SignIn } from '@clerk/nextjs'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export default async function SignInPage() {
  const { isAuthenticated } = await auth()

  if (isAuthenticated) redirect('/')

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <SignIn withSignUp forceRedirectUrl="/" signUpForceRedirectUrl="/" />
    </main>
  )
}
