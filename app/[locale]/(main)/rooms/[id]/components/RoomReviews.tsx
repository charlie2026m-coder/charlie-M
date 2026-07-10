'use client'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { FaStar, FaStarHalfAlt, FaRegStar, FaGoogle } from 'react-icons/fa'
import { FiArrowUpRight } from 'react-icons/fi'

interface Review {
  name: string
  rating: number
  review: string
  time: string
  reviewUri?: string | null
  authorUri?: string | null
  photoUri?: string | null
}
interface ReviewsData {
  rating: number | null
  userRatingCount: number | null
  googleMapsUri?: string | null
  reviewsUrl?: string | null
  reviews: Review[]
}

// Five gold stars, half-star aware — matches how Google renders a rating.
function Stars({ value, className = '' }: { value: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-0.5 text-amber-400 ${className}`} aria-hidden='true'>
      {Array.from({ length: 5 }).map((_, i) => {
        const n = i + 1
        if (value >= n) return <FaStar key={i} />
        if (value >= n - 0.5) return <FaStarHalfAlt key={i} />
        return <FaRegStar key={i} className='text-amber-200' />
      })}
    </span>
  )
}

// Google-style guest reviews for the room page. Reuses the existing bearer-free
// /api/reviews proxy (Google Places → rating + reviews + Maps links). Every
// review card, the rating pill and the footer link open the place/review on
// Google (required attribution + the guest can read the rest / leave one).
const RoomReviews = () => {
  const t = useTranslations('roomReviews')
  const [data, setData] = useState<ReviewsData | null>(null)

  useEffect(() => {
    let alive = true
    fetch('/api/reviews')
      .then((r) => r.json())
      .then((d) => {
        if (alive && d?.reviews) setData(d)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  const reviews = (data?.reviews ?? []).filter((r) => r.review?.trim()).slice(0, 6)
  if (!reviews.length) return null

  const placeLink = data?.googleMapsUri || data?.reviewsUrl || undefined
  const initial = (name: string) => name?.trim()?.[0]?.toUpperCase() ?? '?'

  return (
    <section aria-labelledby='room-reviews-heading' className='mb-[30px]'>
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6'>
        <h2 id='room-reviews-heading' className='text-[24px] md:text-[30px] font-semibold text-mute leading-tight'>
          {t('title')}
        </h2>
        {data?.rating != null && (
          <a
            href={placeLink}
            target='_blank'
            rel='noopener noreferrer'
            className='inline-flex items-center gap-2 self-start rounded-full border border-light1 px-4 py-1.5 transition-colors hover:border-blue'
          >
            <span className='text-lg font-bold leading-none text-mute'>{data.rating.toFixed(1)}</span>
            <Stars value={data.rating} />
            {data.userRatingCount != null && (
              <span className='text-sm text-dark'>· {t('count', { count: data.userRatingCount })}</span>
            )}
            <FaGoogle className='size-4 text-dark ml-0.5' aria-label='Google' />
          </a>
        )}
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4'>
        {reviews.map((r, i) => (
          <a
            key={`${r.name}-${i}`}
            href={r.reviewUri || placeLink}
            target='_blank'
            rel='noopener noreferrer'
            className='group flex flex-col gap-3 rounded-2xl border border-light1 bg-white p-5 transition-all hover:border-blue hover:shadow-sm'
          >
            <div className='flex items-center gap-3'>
              <span
                aria-hidden='true'
                className='grid place-items-center size-9 rounded-full bg-light2 text-blue font-bold shrink-0'
              >
                {initial(r.name)}
              </span>
              <div className='min-w-0'>
                <p className='font-semibold text-mute text-sm truncate'>{r.name}</p>
                <p className='text-xs text-dark'>{r.time}</p>
              </div>
              <FaGoogle
                className='size-3.5 text-dark ml-auto shrink-0 transition-colors group-hover:text-blue'
                aria-hidden='true'
              />
            </div>
            <Stars value={r.rating} className='text-sm' />
            <p className='text-sm text-mute/80 leading-relaxed line-clamp-6'>{r.review}</p>
          </a>
        ))}
      </div>

      {placeLink && (
        <a
          href={placeLink}
          target='_blank'
          rel='noopener noreferrer'
          className='mt-4 inline-flex items-center gap-1 text-sm font-medium text-blue hover:underline'
        >
          {t('seeAllOnGoogle')}
          <FiArrowUpRight className='size-4' />
        </a>
      )}
    </section>
  )
}

export default RoomReviews
