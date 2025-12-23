'use client';
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/app/_components/ui/ClientDialog";
import { Button } from "../ui/button";
import { useState } from "react";
import LoginForm from "./LoginForm";
// import RegisterForm from "./RegisterForm";
import Success from "./Success";
import ForgotPassword from "./ForgotPassword";
import ReservationForm from "./ReservationForm";
import { cn } from '@/lib/utils'

export type contentType = 'signin' | 'signup' | 'confirm' | 'pass' | 'forgot' | 'resetPassword' | 'login' | 'success' | 'reservation';

//I created one modal for all operations with auth :) so depends of steps I show different content
//initial type we set via props and show trigger button like login or sign up
const  AuthModal = ({ type = 'signin', className }: { type: contentType, className?: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [formType, setFormType] = useState<contentType>(type);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) setFormType(type);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {
          type === 'signin' 
            ?<Button variant="outline" className={className}>Login</Button>
            :<button className={cn(className, "text-lg text-brown hover:text-brown/50 cursor-pointer px-2")}>Sign Up</button>
        }
      </DialogTrigger>
      <DialogContent className="!max-w-[600px] px-4 md:px-15 xl:px-25 w-[95%] gap-0  py-[50px] rounded-3xl bg-white">
        {/* Hide the title of dialog but left him for screen readers */}
        <DialogTitle className="absolute opacity-0">{titles[formType as keyof typeof titles]}</DialogTitle>


        {/* Showe content based on chosen form type */}
        {formType === 'signin' && <LoginForm setFormType={setFormType} />}
        {/* {formType === 'signup' && <RegisterForm setFormType={setFormType} />} */}
        {formType === 'forgot' && <ForgotPassword setFormType={setFormType} />}


        {/* Show Success image that need confirm email */}
        {formType === 'confirm' && <Success type='confirm' onClose={() => handleOpenChange(false)} />}
        {/* Show Success image that user need go email to continue reset password */}
        {formType === 'pass' && <Success type='pass' onClose={() => handleOpenChange(false)} />} 
        {formType === 'reservation' && <ReservationForm />}
      </DialogContent>
    </Dialog>
  )
}

export default AuthModal

//this titles for screen readers
const titles = { 
  signin: 'Login', 
  signup: 'Registration', 
  confirm: 'Please check the email address to confirm your account', 
  pass: 'Please check the email address to reset your password',
  forgot: 'Forgot Password',
}