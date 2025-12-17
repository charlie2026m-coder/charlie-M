import { TbMailFilled } from "react-icons/tb";
import { Input } from "./input";
import { FieldValues, UseFormRegister, Path } from "react-hook-form";
import { FaUser } from "react-icons/fa6";
import { MdLock } from "react-icons/md";
import { useState } from "react";
import { IoEyeSharp, IoEyeOffSharp } from "react-icons/io5";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { BsFillTelephoneFill } from "react-icons/bs";
import { BiSolidIdCard } from "react-icons/bi";
import { FaGlobeAsia } from "react-icons/fa";
import { TbDirectionsFilled } from "react-icons/tb";


interface CustomInputProps<T extends FieldValues> {
  register: UseFormRegister<T>;
  name: Path<T>;
  type: 'email' | 'password' | 'text' | 'phone';
  placeholder: string;
  icon?: 'email' | 'password' | 'name' | 'booking' | 'phone' | 'id' | 'nationality' | 'address';
  isError?: boolean;
  className?: string;
}

function CustomInput<T extends FieldValues>({
  register,
  name,
  type,
  placeholder,
  icon,
  isError,
  className,
}: CustomInputProps<T>) {
  const iconType = icon || (type === 'email' ? 'email' : type === 'password' ? 'password' : 'name');
  const [showPassword, setShowPassword] = useState(false);

  const icons: Record<string, React.ReactNode> = {
    email: <TbMailFilled className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-blue" />,
    password: <MdLock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-blue" />,
    name: <FaUser className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-blue" />,
    booking: <Image className="absolute left-3 top-1/2 -translate-y-1/2 size-6" src="/images/booking-icon-input.png" alt="booking" width={24} height={24} />,
    phone: <BsFillTelephoneFill className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-blue" />,
    id: <BiSolidIdCard className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-blue" />,
    nationality: <FaGlobeAsia className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-blue" />,
    address: <TbDirectionsFilled className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-blue" />,
  };
  
  return (
    <div className={cn("relative", className)}>
      {icons[iconType]}
      <Input
        type={type === 'password' ? (showPassword ? 'text' : 'password') : type}
        placeholder={placeholder}
        className={cn("pl-[45px] bg-white h-10 rounded-full border-gray shadow-none", isError && "!border-red text-red focus:border-red !ring-red/20 !focus:ring-red ")}
        {...register(name)}
      />
      {type === 'password' && (
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray/50 hover:text-gray transition-colors"
        >
          {showPassword ? <IoEyeOffSharp className="size-5 text-brown" /> : <IoEyeSharp className="size-5 text-brown" />}
        </button>
      )}
    </div>
  )
}

export default CustomInput