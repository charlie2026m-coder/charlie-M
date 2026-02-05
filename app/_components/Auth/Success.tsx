import Image from "next/image";
import { Button } from "../ui/button";
import { useTranslations } from 'next-intl';

const Success = ({type = 'pass', onClose}: {type: 'pass' | 'confirm' | 'passSuccess', onClose?: () => void}) => {
  const t = useTranslations('forgotPassword');
  const tReset = useTranslations('resetPassword');
  const tSignUp = useTranslations('signUp');
  const image = type === 'passSuccess' ? '/images/password-success.svg' : '/images/reset-pass-man.svg';
  return (
    <div className="flex flex-col items-center justify-center">
      <h1 className="text-xl font-[400] text-center">
        {type === 'passSuccess' ? tReset('successfully') : t('checkEmail')}
      </h1>
      <Image src={image} alt="sucess image" width={204} height={240} className="w-[200px] h-[240px] my-5" />
      <p className="text-dark text-center mb-8 ">
        {type === 'pass' && t('confirmationSent')}
        {type === 'confirm' && tSignUp('emailConfirmationSent')}
        {type === 'passSuccess' && tReset('passwordChangedSuccessfully')}
        </p>
      <Button className="w-full" onClick={onClose}>{type === 'passSuccess' ? tReset('ok') : t('ok')}</Button>
    </div>
  )
}

export default Success