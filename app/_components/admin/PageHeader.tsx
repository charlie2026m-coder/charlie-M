import Link from 'next/link'
import { MdArrowBack } from 'react-icons/md'

/**
 * The top of every admin page: what this screen is, in one line of plain
 * words, and the two or three things you can do here on the right. The menu
 * lives in the shell, so no page carries its own row of "go elsewhere"
 * buttons any more.
 */
export function PageHeader({
  title,
  description,
  actions,
  back,
  className = '',
}: {
  title: React.ReactNode
  description?: React.ReactNode
  /** Buttons for this screen only — refresh, print, sync. Never navigation. */
  actions?: React.ReactNode
  /** For the edit screens: the list they came from. */
  back?: { href: string; label: string }
  className?: string
}) {
  return (
    <div className={`mb-6 flex flex-wrap items-start justify-between gap-3 ${className}`}>
      <div className='min-w-0'>
        {back && (
          <Link
            href={back.href}
            className='mb-1 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-black'
          >
            <MdArrowBack /> {back.label}
          </Link>
        )}
        <h1 className='text-2xl font-bold leading-tight text-black'>{title}</h1>
        {description && <p className='mt-1 max-w-[60ch] text-sm text-gray-500'>{description}</p>}
      </div>
      {actions && <div className='flex flex-wrap items-center gap-2'>{actions}</div>}
    </div>
  )
}
