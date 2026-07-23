import { getTranslations } from 'next-intl/server'
import Image from 'next/image'
import { MdOutlineThermostat, MdOutlineAcUnit, MdOutlineWbSunny, MdOutlineEco } from 'react-icons/md'
import { Reveal } from '../../welcome/components/Reveal'
import { PHONE_NUMBER, WHATSAPP_NUMBER, EMAIL } from '@/lib/Constants'

// Public in-room guide for the climate control (heating & cooling) — meant for
// a QR code next to the room thermostat, like /information. No auth, no
// reservation context. Header/footer come from the [locale] layout.
//
// NOTE: the steps are deliberately generic (thermostat panel, set temperature,
// wait, keep windows closed) — swap in the real system's name, buttons and
// photos once the hotel provides them.
const STEPS = ['1', '2', '3', '4'] as const

type Props = { params: Promise<{ locale: string }> }

export default async function HeatingAndCoolingPage({ params }: Props) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'heatingCooling' })

  const contactClass =
    'flex items-center gap-2 border border-dark-gold/40 rounded-lg px-4 h-[52px] text-mute hover:bg-light-bg hover:border-dark-gold transition-all duration-200 active:scale-[0.98] w-full sm:w-auto'

  return (
    <div className='max-w-[900px] mx-auto w-full px-4 md:px-8 py-10 md:py-16'>
      {/* Intro */}
      <Reveal className='flex flex-col gap-3 mb-10'>
        <div className='inline-flex items-center gap-2 self-start rounded-2xl bg-blue/20 px-4 py-2'>
          <MdOutlineThermostat className='size-5 text-dark-gold' />
          <span className='text-[13px] font-medium uppercase tracking-[0.08em] text-mute'>
            {t('badge')}
          </span>
        </div>
        <h1 className='font-semibold text-mute text-[30px] md:text-[44px] leading-tight text-balance'>
          {t('title')}
        </h1>
        <p className='text-dark text-base md:text-lg max-w-2xl'>{t('subtitle')}</p>
      </Reveal>

      {/* Steps */}
      <div className='flex flex-col mb-12'>
        {STEPS.map((step, index) => (
          <Reveal key={step} delay={index * 90} className='flex gap-[18px] items-start py-2.5 lg:py-3 relative'>
            {index < STEPS.length - 1 && (
              <div className='absolute left-[17px] lg:left-[23px] top-[25px] lg:top-[35px] bottom-[-25px] lg:bottom-[-35px] w-px bg-dark-gold/30' />
            )}
            <div className='shrink-0 w-[35px] h-[35px] lg:w-[47px] lg:h-[47px] rounded-full bg-dark-gold flex items-center justify-center text-white font-medium text-[20px] z-10 shadow-sm shadow-dark-gold/40'>
              {step}
            </div>
            <div className='flex flex-col gap-2 pt-1'>
              <p className='text-mute text-[18px] lg:text-[22px] font-medium leading-6'>
                {t(`steps.${step}.title`)}
              </p>
              <p className='text-dark text-[15px] lg:text-[17px] leading-relaxed'>
                {t(`steps.${step}.description`)}
              </p>
            </div>
          </Reveal>
        ))}
      </div>

      {/* Season tips */}
      <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-6'>
        <Reveal className='bg-blue/20 rounded-[20px] p-5 flex flex-col gap-2'>
          <div className='flex items-center gap-2'>
            <MdOutlineWbSunny className='size-6 text-dark-gold shrink-0' />
            <h3 className='font-semibold text-mute'>{t('summer.title')}</h3>
          </div>
          <p className='text-dark text-[15px] leading-relaxed'>{t('summer.description')}</p>
        </Reveal>
        <Reveal delay={90} className='bg-blue/20 rounded-[20px] p-5 flex flex-col gap-2'>
          <div className='flex items-center gap-2'>
            <MdOutlineAcUnit className='size-6 text-dark-gold shrink-0' />
            <h3 className='font-semibold text-mute'>{t('winter.title')}</h3>
          </div>
          <p className='text-dark text-[15px] leading-relaxed'>{t('winter.description')}</p>
        </Reveal>
      </div>

      {/* Eco note */}
      <Reveal className='flex items-start gap-3 border border-light1 rounded-[20px] p-5 mb-12'>
        <MdOutlineEco className='size-6 text-dark-gold shrink-0 mt-0.5' />
        <p className='text-dark text-[15px] leading-relaxed'>{t('eco')}</p>
      </Reveal>

      {/* Need help */}
      <Reveal className='flex flex-col gap-4'>
        <h2 className='font-semibold text-mute text-xl'>{t('help.title')}</h2>
        <p className='text-dark text-[15px]'>{t('help.description')}</p>
        <div className='flex flex-col sm:flex-row gap-3'>
          <a href={`tel:${PHONE_NUMBER.replace(/\D/g, '')}`} className={contactClass}>
            <Image src='/images/welcome-phone-icon.svg' alt='' width={18} height={18} className='object-contain [filter:brightness(0)]' />
            <span className='font-semibold'>{PHONE_NUMBER}</span>
          </a>
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER.replace(/\D/g, '')}`}
            target='_blank'
            rel='noopener noreferrer'
            className={contactClass}
          >
            <Image src='/images/welcome-whatsup-icon.svg' alt='' width={18} height={18} className='object-contain [filter:brightness(0)]' />
            <span className='font-medium'>{t('help.whatsapp')}</span>
          </a>
          <a href={`mailto:${EMAIL}`} className={contactClass}>
            <Image src='/images/welcome-message-icon.svg' alt='' width={18} height={18} className='object-contain [filter:brightness(0)]' />
            <span className='font-semibold'>{EMAIL}</span>
          </a>
        </div>
      </Reveal>
    </div>
  )
}
