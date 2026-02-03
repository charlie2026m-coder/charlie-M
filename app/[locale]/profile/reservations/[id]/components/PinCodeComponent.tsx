import { toast } from "sonner";
import { useTranslations } from "next-intl";

export const PinCodeComponent = ({roomNumber, code}: {roomNumber: number, code: number}) => {
  const t = useTranslations('profile');
  
  const handleCopy = async (text: string | number, label: string) => {
    try {
      await navigator.clipboard.writeText(text.toString());
      toast.success(t('copiedToClipboard', { label }));
    } catch (err) {
      toast.error(t('failedToCopy'));
    }
  };

  return (
    <div className='flex flex-col lg:flex-row gap-4 lg:gap-6'>
      <div className='flex flex-col gap-2 flex-1'>
        <span className='text-xs text-gray-600 font-medium'>{t('room')} №</span>
        <div 
          className=' from-white to-gray-50 flex items-center justify-center px-2 py-1 cursor-pointer border rounded-lg transition-all duration-200 font-bold text-lg group relative' 
          title={t('clickToCopy')}
          onClick={() => handleCopy(roomNumber, t('roomNumber'))}
        >
          <span className='text-gray-800'>{roomNumber}</span>
          <div className='absolute inset-0 bg-blue-500 opacity-0  rounded-lg transition-opacity' />
        </div>
      </div>

      <div className='flex flex-col gap-2 flex-1'>
        <span className='text-xs text-gray-600 font-medium'>{t('accessPin')}</span>
        <div 
          className='rounded-lg border-2 border-gray-200 flex items-center justify-center px-2 py-1 cursor-pointer hover:border-blue  transition-all duration-200 font-bold text-lg group relative'
          onClick={() => handleCopy(code, t('code'))}
          title={t('clickToCopy')}
        >
          <span className='text-gray-800 tracking-wider'>{code}</span>
          <div className='absolute inset-0 bg-blue opacity-0 group-hover:opacity-5 rounded-lg transition-opacity' />
        </div>
      </div>
    </div>
  )
}