'use client'

/**
 * Your own login. Two things live here and nothing else: the password, and
 * the second step — a 6-digit code from an authenticator app such as Google
 * Authenticator, asked for after the password on every login.
 *
 * Turning the second step on happens in one sitting: scan, type the first
 * code, done. A factor that was started and never confirmed is a dead entry
 * on the account, so an abandoned attempt is deleted the next time this
 * page loads, and Cancel deletes it on the spot.
 */

import { useCallback, useEffect, useState } from 'react'
import { MdCheckCircle, MdShield } from 'react-icons/md'
import { PageHeader } from '@/app/_components/admin/PageHeader'
import { useAdmin } from '@/app/_components/admin/AdminShell'
import { Button } from '@/app/_components/ui/button'
import { AREA_INFO, roleLabel } from '@/lib/adminAccess'
import { supabase } from '@/lib/supabase'

const field = 'h-10 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-black'
const heading = 'mb-3 text-xs font-medium uppercase tracking-[0.14em] text-gray-500'

export default function SettingsPage() {
  const { areas, who } = useAdmin()
  return (
    <main className='mx-auto w-full max-w-[720px] p-4 pb-16 sm:p-6'>
      <PageHeader title='Settings' description='Your own login: the password, and the second step after it.' />

      <section className='mb-10'>
        <h2 className={heading}>You</h2>
        <div className='rounded-xl border border-gray-200 p-4'>
          <div className='font-medium'>{who}</div>
          <div className='mt-1 text-sm text-gray-500'>
            {roleLabel(areas)} · {areas.map(a => AREA_INFO[a].label).join(', ')}
          </div>
        </div>
      </section>

      <PasswordSection />
      <TwoFactorSection />
    </main>
  )
}

function PasswordSection() {
  const [pw, setPw] = useState('')
  const [again, setAgain] = useState('')
  const [state, setState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [note, setNote] = useState('')

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setNote('')
    if (pw.length < 8) {
      setNote('Use at least 8 characters.')
      return
    }
    if (pw !== again) {
      setNote('The two passwords are not the same.')
      return
    }
    setState('saving')
    const { error } = await supabase.auth.updateUser({ password: pw })
    if (error) {
      setState('idle')
      setNote(error.message)
      return
    }
    setState('saved')
    setPw('')
    setAgain('')
  }

  return (
    <section className='mb-10'>
      <h2 className={heading}>Password</h2>
      <form onSubmit={e => void save(e)} className='rounded-xl border border-gray-200 p-4'>
        <div className='grid gap-3 sm:grid-cols-2'>
          <label className='block text-sm'>
            <span className='mb-1 block text-xs text-gray-500'>New password</span>
            <input
              type='password'
              autoComplete='new-password'
              value={pw}
              onChange={e => {
                setPw(e.target.value)
                setState('idle')
              }}
              className={field}
            />
          </label>
          <label className='block text-sm'>
            <span className='mb-1 block text-xs text-gray-500'>Once more</span>
            <input
              type='password'
              autoComplete='new-password'
              value={again}
              onChange={e => setAgain(e.target.value)}
              className={field}
            />
          </label>
        </div>
        <div className='mt-3 flex flex-wrap items-center gap-3'>
          <Button type='submit' size='sm' className='h-9' disabled={state === 'saving' || !pw}>
            {state === 'saving' ? 'Saving…' : 'Change password'}
          </Button>
          {state === 'saved' && (
            <span className='text-sm text-green-700'>Changed. Use it from your next login.</span>
          )}
          {note && <span className='text-sm text-red-700'>{note}</span>}
        </div>
      </form>
    </section>
  )
}

interface Factor {
  id: string
  status: 'verified' | 'unverified'
}

function TwoFactorSection() {
  const [factors, setFactors] = useState<Factor[] | null>(null)
  const [setup, setSetup] = useState<{ id: string; qr: string; secret: string } | null>(null)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')

  const load = useCallback(async () => {
    const { data } = await supabase.auth.mfa.listFactors()
    const all = (data?.all ?? []) as Factor[]
    for (const dead of all.filter(f => f.status === 'unverified')) {
      await supabase.auth.mfa.unenroll({ factorId: dead.id })
    }
    setFactors(all.filter(f => f.status === 'verified'))
  }, [])

  useEffect(() => {
    // Deferred a tick: the list comes from the auth server, and this keeps the
    // effect itself free of state changes (react-hooks/set-state-in-effect).
    const timer = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(timer)
  }, [load])

  const on = (factors ?? []).length > 0
  const digits = code.replace(/\s/g, '')

  const start = async () => {
    setBusy(true)
    setNote('')
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'Authenticator app',
    })
    setBusy(false)
    if (error || !data) {
      setNote(error?.message ?? 'Could not start. Try again.')
      return
    }
    setSetup({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret })
    setCode('')
  }

  const confirm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!setup) return
    setBusy(true)
    setNote('')
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: setup.id, code: digits })
    setBusy(false)
    if (error) {
      setNote('That code did not work. Codes change every 30 seconds — type the one showing now.')
      return
    }
    setSetup(null)
    setCode('')
    await load()
  }

  const cancel = async () => {
    if (setup) await supabase.auth.mfa.unenroll({ factorId: setup.id })
    setSetup(null)
    setCode('')
    setNote('')
  }

  const turnOff = async () => {
    if (!window.confirm('Turn the second step off? From then on the password alone opens the panel.')) return
    setBusy(true)
    setNote('')
    for (const f of factors ?? []) {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: f.id })
      if (error) setNote(error.message)
    }
    setBusy(false)
    await load()
  }

  return (
    <section>
      <h2 className={heading}>Two-step login</h2>
      <div className='rounded-xl border border-gray-200 p-4'>
        {factors === null ? (
          <p className='text-sm text-gray-500'>Loading…</p>
        ) : setup ? (
          <form onSubmit={e => void confirm(e)}>
            <ol className='list-decimal space-y-4 pl-5 text-sm'>
              <li>
                Install <strong>Google Authenticator</strong> (or any authenticator app) on your phone.
              </li>
              <li>
                <div>In the app, add an account by scanning this code:</div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={setup.qr}
                  alt='QR code for the authenticator app'
                  className='my-3 h-44 w-44 rounded-lg border border-gray-200'
                />
                <div className='text-gray-500'>Cannot scan? Type this key into the app instead:</div>
                <code className='mt-1 block break-all rounded-lg bg-gray-100 p-2 text-xs'>{setup.secret}</code>
              </li>
              <li>
                <div>Type the 6-digit code the app shows now:</div>
                <input
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  inputMode='numeric'
                  autoComplete='one-time-code'
                  placeholder='123 456'
                  autoFocus
                  className={`${field} mt-2 w-40 text-center text-lg tracking-widest`}
                />
              </li>
            </ol>
            <div className='mt-4 flex flex-wrap items-center gap-3'>
              <Button type='submit' size='sm' className='h-9' disabled={busy || digits.length < 6}>
                {busy ? 'Checking…' : 'Turn on'}
              </Button>
              <Button type='button' variant='outline' size='sm' className='h-9' onClick={() => void cancel()}>
                Cancel
              </Button>
              {note && <span className='text-sm text-red-700'>{note}</span>}
            </div>
          </form>
        ) : on ? (
          <>
            <div className='flex items-center gap-2 font-medium text-green-700'>
              <MdCheckCircle /> On
            </div>
            <p className='mt-1 text-sm text-gray-500'>
              After the password, every login asks for the code from your authenticator app. Lost the
              phone? Somebody with Team can turn this off for you.
            </p>
            <Button variant='outline' size='sm' className='mt-3 h-9' disabled={busy} onClick={() => void turnOff()}>
              Turn off
            </Button>
            {note && <p className='mt-2 text-sm text-red-700'>{note}</p>}
          </>
        ) : (
          <>
            <div className='flex items-center gap-2 font-medium'>
              <MdShield /> Off
            </div>
            <p className='mt-1 text-sm text-gray-500'>
              With it on, a stolen password alone is not enough: every login also asks for a 6-digit
              code from an app on your phone. Two minutes to set up.
            </p>
            <Button size='sm' className='mt-3 h-9' disabled={busy} onClick={() => void start()}>
              {busy ? 'Starting…' : 'Turn on'}
            </Button>
            {note && <p className='mt-2 text-sm text-red-700'>{note}</p>}
          </>
        )}
      </div>
    </section>
  )
}
