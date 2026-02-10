'use client'
import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/app/_components/ui/ClientDialog'
import { Button } from '@/app/_components/ui/button'
import { IoLogOut } from 'react-icons/io5'
import { useLogout } from '@/app/hooks/useAuth'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/navigation'

const Logout = () => {
  const t = useTranslations('profile')
  const [isOpen, setIsOpen] = useState(false)
  const logoutMutation = useLogout()
  const router = useRouter()

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync()
      setIsOpen(false)
    } catch (error) {
      // Even if logout fails (e.g., no session), redirect to home
      console.error('Logout error:', error)
      sessionStorage.removeItem('guestMode')
      sessionStorage.removeItem('guestData')
      setIsOpen(false)
      router.push('/')
      router.refresh()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <div 
          className={cn(
            'flex items-center p-2.5 rounded-[16px] gap-2 w-full cursor-pointer hover:bg-light-bg transition-all duration-300 text-mute'
          )}
        >
          <IoLogOut className='size-6 text-blue' /> {t('logout')}
        </div>
      </DialogTrigger>
      
      <DialogContent className='w-[90%] max-w-[600px] px-6 rounded-3xl gap-0'>
        <DialogHeader>
          <DialogTitle className='text-center text-xl mb-5'>{t('logout')}</DialogTitle>
        </DialogHeader>
        <p className='inter text-center text-[15px] mb-3'>{t('logoutConfirm')}</p>
          <Image src='/images/logout-man.svg' alt='logout' width={300} height={230} className='w-[300px] h-[230px] object-cover mx-auto' />

        <div className='flex flex-col gap-6 py-4'>
         
          
          <div className='flex gap-3 justify-center'>
            <Button 
              variant='outline' 
              className='flex-1 max-w-[150px] h-[45px]'
              onClick={() => setIsOpen(false)}
            >
              {t('cancel')}
            </Button>
            <Button 
              className='flex-1 max-w-[150px] h-[45px]'
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
            >
              {logoutMutation.isPending ? t('loggingOut') : t('yes')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default Logout