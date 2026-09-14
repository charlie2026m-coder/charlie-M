'use client'

/**
 * Staff sign-in, in up to two steps: the password, then — for anybody who
 * has set it up — the 6-digit code from their authenticator app. Where the
 * login lands afterwards depends on what the person may do: the panel, or
 * the kitchen screen alone.
 *
 * The code step is not optional once set up: the server-side gate refuses a
 * session that has not passed it, so this page is also where somebody lands
 * when they open the panel halfway through.
 */

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { FcGoogle } from 'react-icons/fc'
import { landingFor, normaliseAreas } from '@/lib/adminAccess'

const input =
  'w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-black transition-colors text-black placeholder:text-gray-400'

/** Two-step login set up on this account, and not yet passed this session? */
async function needsCode(): Promise<boolean> {
  const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  return data?.nextLevel === 'aal2' && data.currentLevel !== 'aal2'
}

export default function AdminLoginPage() {
  const router = useRouter()
  const [step, setStep] = useState<'password' | 'code'>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  /** Past the password and the code: where does this login go? */
  const finish = useCallback(
    async (userEmail: string) => {
      const { data: row } = await supabase.from('admins').select('areas').eq('email', userEmail).single()
      const destination = row ? landingFor(normaliseAreas(row.areas)) : null
      if (!destination) {
        setError(
          row
            ? 'This login has nothing to open yet. Ask whoever manages the team.'
            : 'This account is not on the team.',
        )
        await supabase.auth.signOut()
        setStep('password')
        return
      }
      router.push(destination)
    },
    [router],
  )

  // Already signed in? Straight through — or to the code, if that is what is missing.
  useEffect(() => {
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user?.email) return
      if (await needsCode()) {
        setEmail(user.email)
        setStep('code')
        return
      }
      await finish(user.email)
    })()
  }, [finish])

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      if (!data.user?.email) throw new Error('Login failed')
      if (await needsCode()) {
        setStep('code')
        return
      }
      await finish(data.user.email)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { data: factors, error: listError } = await supabase.auth.mfa.listFactors()
      if (listError) throw listError
      const factor = factors?.totp?.[0]
      if (!factor) throw new Error('No authenticator app is set up on this account.')
      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId: factor.id,
        code: code.replace(/\s/g, ''),
      })
      if (error) {
        throw new Error('That code did not work. Codes change every 30 seconds — type the one showing now.')
      }
      await finish(email)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not check the code')
    } finally {
      setLoading(false)
    }
  }

  const startOver = async () => {
    await supabase.auth.signOut()
    setStep('password')
    setCode('')
    setError('')
  }

  const handleGoogleLogin = async () => {
    setLoading(true)
    setError('')
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/admin/rooms`,
        },
      })
      if (error) throw error
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google login failed')
      setLoading(false)
    }
  }

  const errorBox = error && (
    <div className='text-red-600 text-sm text-center bg-red-50 py-2 rounded-lg'>{error}</div>
  )

  return (
    <div className='min-h-screen flex items-center justify-center bg-white'>
      <div className='max-w-md w-full p-8'>
        <div className='text-center mb-8'>
          <div className='inline-flex items-center justify-center w-16 h-16 rounded-full bg-black text-white mb-4 text-2xl font-bold'>
            C
          </div>
          <h2 className='text-3xl font-bold text-black'>
            {step === 'code' ? 'One more step' : 'Charlie M staff'}
          </h2>
          <p className='text-gray-500 mt-2 text-sm'>
            {step === 'code'
              ? 'Type the 6-digit code from your authenticator app.'
              : 'Sign in to continue'}
          </p>
        </div>

        {step === 'code' ? (
          <form onSubmit={handleCode} className='space-y-4'>
            <input
              type='text'
              inputMode='numeric'
              autoComplete='one-time-code'
              autoFocus
              required
              placeholder='123 456'
              className={`${input} text-center text-2xl tracking-[0.3em]`}
              value={code}
              onChange={e => setCode(e.target.value)}
            />
            {errorBox}
            <button
              type='submit'
              disabled={loading}
              className='w-full bg-black text-white py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50'
            >
              {loading ? 'Checking…' : 'Continue'}
            </button>
            <button
              type='button'
              onClick={() => void startOver()}
              className='w-full py-2 text-sm text-gray-500 hover:text-black'
            >
              Start over with a different account
            </button>
          </form>
        ) : (
          <form onSubmit={handlePassword} className='space-y-4'>
            <input
              type='email'
              required
              autoComplete='username'
              placeholder='Email'
              className={input}
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
            <input
              type='password'
              required
              autoComplete='current-password'
              placeholder='Password'
              className={input}
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            {errorBox}
            <button
              type='submit'
              disabled={loading}
              className='w-full bg-black text-white py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50'
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>

            <div className='relative my-6'>
              <div className='absolute inset-0 flex items-center'>
                <div className='w-full border-t border-gray-200' />
              </div>
              <div className='relative flex justify-center text-xs uppercase'>
                <span className='bg-white px-2 text-gray-500'>or</span>
              </div>
            </div>

            <button
              type='button'
              onClick={() => void handleGoogleLogin()}
              disabled={loading}
              className='w-full flex items-center justify-center gap-2 py-3 border-2 border-gray-200 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50'
            >
              <FcGoogle className='size-5' />
              <span className='text-black'>Continue with Google</span>
            </button>
          </form>
        )}

        <p className='text-xs text-gray-400 text-center mt-8'>Staff accounts only</p>
      </div>
    </div>
  )
}
