import Image from "next/image";
import { Button } from "../ui/button";

const Success = ({type = 'pass', onClose}: {type: 'pass' | 'confirm' | 'passSuccess', onClose: () => void}) => {
  const image = type === 'passSuccess' ? '/images/update-password.png' : '/images/check-email.png';
  return (
    <div className="flex flex-col items-center justify-center">
      <h1 className="text-xl font-[400] text-center">
        {type === 'passSuccess' ? 'Successfully' : 'Check your Email Address'}
      </h1>
      <Image src={image} alt="sucess image" width={226} height={226} className="w-[226px] h-[226px]" />
      <p className="text-gray text-center mb-8">
        {type === 'pass' && 'We have sent a link to your email address to reset password'}
        {type === 'confirm' && 'We have sent a link to your email address to confirm your email address. Please check your email!'}
        {type === 'passSuccess' && 'Your password has been changed successfully'}
        </p>
      <Button className="w-full" onClick={onClose}>Ok</Button>
    </div>
  )
}

export default Success