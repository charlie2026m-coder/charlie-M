'use client'

/**
 * Staff sign-in, in up to two steps: the password, then — for anybody who
 * has set it up — the 6-digit code from their authenticator app. Where the
 * login lands afterwards depends on what the person may do: the panel, or
 * the kitchen screen alone.
 *
 * Built for people who are not at a computer all day: labels on the fields,
 * an eye that shows the password, a warning when Caps Lock is on, errors in
 * plain words, a "forgot password" that sends the reset mail from right
 * here, and a code step that goes on by itself once six digits are in.
 *
 * The code step is not optional once set up: the server-side gate refuses a
 * session that has not passed it, so this page is also where somebody lands
 * when they open the panel halfway through.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { FcGoogle } from 'react-icons/fc'
import { LuEye, LuEyeOff, LuShieldCheck, LuTriangleAlert } from 'react-icons/lu'
import { landingFor, normaliseAreas } from '@/lib/adminAccess'
import { resetPassword } from '@/app/actions/supabase/auth/resetPassword'

const field =
  'h-12 w-full rounded-xl border-2 border-gray-200 bg-white px-4 text-base text-black outline-none transition-colors placeholder:text-gray-400 focus:border-black'
const label = 'mb-1 block text-sm font-medium text-gray-700'

/** Supabase's messages, in words a person at the desk can act on. */
function explain(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('invalid login credentials') || m.includes('invalid_credentials')) {
    return 'Wrong email or password.'
  }
  if (m.includes('email not confirmed')) return 'This email is not confirmed yet.'
  if (m.includes('rate limit') || m.includes('too many')) {
    return 'Too many attempts. Wait a minute and try again.'
  }
  if (m.includes('network') || m.includes('fetch')) return 'No connection. Check the internet and try again.'
  return message
}

/** The `aal` claim of the session's token: 'aal2' once the code has been passed. */
function assuranceLevel(accessToken: string | undefined): string | null {
  if (!accessToken) return null
  try {
    const payload = JSON.parse(atob(accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return typeof payload?.aal === 'string' ? payload.aal : null
  } catch {
    return null
  }
}

/**
 * Two-step login set up on this account, and not yet passed this session?
 * Asked of the auth server (getUser) rather than the copy of the user kept in
 * the cookie — that copy predates an enrolment made on another device, and
 * the server-side gate would then bounce a login this page thought complete.
 */
async function needsCode(): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const enrolled = (user?.factors ?? []).some(f => f.status === 'verified')
  if (!enrolled) return false
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return assuranceLevel(session?.access_token) !== 'aal2'
}

export default function AdminLoginPage() {
  const router = useRouter()
  const [step, setStep] = useState<'password' | 'code'>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [capsLock, setCapsLock] = useState(false)
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  /** The e-mail the session carries — what the admins row is keyed on. */
  const [sessionEmail, setSessionEmail] = useState('')
  const codeSubmitting = useRef(false)

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
      setSessionEmail(user.email)
      if (await needsCode()) {
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
    setNotice('')
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (error) throw new Error(explain(error.message))
      if (!data.user?.email) throw new Error('Login failed')
      setSessionEmail(data.user.email)
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

  const verifyCode = useCallback(
    async (digits: string) => {
      if (codeSubmitting.current) return
      codeSubmitting.current = true
      setLoading(true)
      setError('')
      try {
        const { data: factors, error: listError } = await supabase.auth.mfa.listFactors()
        if (listError) throw listError
        const factor = factors?.totp?.[0]
        if (!factor) throw new Error('No authenticator app is set up on this account.')
        const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code: digits })
        if (error) {
          throw new Error('That code did not work. Codes change every 30 seconds — type the one showing now.')
        }
        await finish(sessionEmail)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not check the code')
        setCode('')
      } finally {
        setLoading(false)
        codeSubmitting.current = false
      }
    },
    [finish, sessionEmail],
  )

  // Six digits in: go, without a second tap.
  const onCodeChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 6)
    setCode(digits)
    if (digits.length === 6) void verifyCode(digits)
  }

  const startOver = async () => {
    await supabase.auth.signOut()
    setStep('password')
    setCode('')
    setPassword('')
    setError('')
  }

  const forgot = async () => {
    setError('')
    setNotice('')
    const address = email.trim()
    if (!address) {
      setError('Type your email above first, then tap this again.')
      return
    }
    setLoading(true)
    const result = await resetPassword(address)
    setLoading(false)
    if (!result.success) {
      setError(result.error || 'Could not send the email.')
      return
    }
    setNotice(`We sent a link to ${address}. Open it, set a new password, then come back here.`)
  }

  const handleGoogleLogin = async () => {
    setLoading(true)
    setError('')
    try {
      // The callback reads this and returns to the panel instead of the guest
      // account; the redirect URL itself has to match Supabase's list exactly.
      document.cookie = 'admin-after-login=1; Path=/; Max-Age=600; SameSite=Lax'
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      })
      if (error) throw error
    } catch (err) {
      setError(err instanceof Error ? explain(err.message) : 'Google login failed')
      setLoading(false)
    }
  }

  const errorBox = error && (
    <div className='flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700'>
      <LuTriangleAlert className='mt-0.5 h-4 w-4 shrink-0' aria-hidden />
      <span>{error}</span>
    </div>
  )

  return (
    <div className='flex min-h-dvh items-center justify-center bg-white px-4 py-8'>
      <div className='w-full max-w-md'>
        <div className='mb-8 text-center'>
          <div className='mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-black text-2xl font-bold text-white'>
            C
          </div>
          <h1 className='text-2xl font-bold text-black'>
            {step === 'code' ? 'One more step' : 'Charlie M staff'}
          </h1>
          <p className='mt-1 text-sm text-gray-500'>
            {step === 'code'
              ? 'Open your authenticator app and type the 6-digit code.'
              : 'Sign in to the panel'}
          </p>
        </div>

        {step === 'code' ? (
          <form
            onSubmit={e => {
              e.preventDefault()
              if (code.length === 6) void verifyCode(code)
            }}
            className='space-y-4'
          >
            <div className='flex items-center justify-center gap-2 text-gray-500'>
              <LuShieldCheck className='h-5 w-5' aria-hidden />
              <span className='text-sm'>{sessionEmail}</span>
            </div>
            <input
              type='text'
              inputMode='numeric'
              autoComplete='one-time-code'
              autoFocus
              placeholder='123456'
              className={`${field} text-center text-3xl tracking-[0.4em]`}
              value={code}
              onChange={e => onCodeChange(e.target.value)}
              disabled={loading}
            />
            {errorBox}
            <button
              type='submit'
              disabled={loading || code.length < 6}
              className='h-12 w-full rounded-xl bg-black font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50'
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
            <div>
              <label htmlFor='email' className={label}>
                Email
              </label>
              <input
                id='email'
                type='email'
                required
                autoFocus
                autoComplete='username'
                placeholder='you@charlie-m.de'
                className={field}
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>

            <div>
              <div className='mb-1 flex items-center justify-between'>
                <label htmlFor='password' className='text-sm font-medium text-gray-700'>
                  Password
                </label>
                <button
                  type='button'
                  onClick={() => void forgot()}
                  disabled={loading}
                  className='text-sm text-gray-500 underline underline-offset-2 hover:text-black'
                >
                  Forgot your password?
                </button>
              </div>
              <div className='relative'>
                <input
                  id='password'
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete='current-password'
                  placeholder='Your password'
                  className={`${field} pr-12`}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyUp={e => setCapsLock(e.getModifierState('CapsLock'))}
                  onBlur={() => setCapsLock(false)}
                />
                <button
                  type='button'
                  onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  className='absolute inset-y-0 right-0 flex w-12 items-center justify-center text-gray-500 hover:text-black'
                >
                  {showPassword ? <LuEyeOff className='h-5 w-5' /> : <LuEye className='h-5 w-5' />}
                </button>
              </div>
              {capsLock && (
                <p className='mt-1 flex items-center gap-1.5 text-xs text-amber-700'>
                  <LuTriangleAlert className='h-3.5 w-3.5' aria-hidden />
                  Caps Lock is on
                </p>
              )}
            </div>

            {errorBox}
            {notice && (
              <div className='rounded-xl bg-green-50 px-3 py-2 text-sm text-green-800'>{notice}</div>
            )}

            <button
              type='submit'
              disabled={loading}
              className='h-12 w-full rounded-xl bg-black font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50'
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
              className='flex h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-gray-200 font-medium transition-colors hover:bg-gray-50 disabled:opacity-50'
            >
              <FcGoogle className='size-5' />
              <span className='text-black'>Continue with Google</span>
            </button>
          </form>
        )}

        <p className='mt-8 text-center text-xs text-gray-400'>Staff accounts only</p>
      </div>
    </div>
  )
}
