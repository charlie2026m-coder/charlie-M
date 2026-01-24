'use client'
import ForgotPassword from '@/app/_components/Auth/ForgotPassword';
import CustomCard from '@/app/_components/ui/CustomCard';

export default function ForgotPasswordPage() {
  return (
    <div className="bg-white px-4 py-16 flex items-center justify-center min-h-screen">
      <CustomCard className="w-full md:border max-w-md p-8">
        <ForgotPassword />
      </CustomCard>
    </div>
  );
}

