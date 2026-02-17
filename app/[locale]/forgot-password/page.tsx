'use client'
import ForgotPassword from '@/app/_components/Auth/ForgotPassword';
import CustomCard from '@/app/_components/ui/CustomCard';
import Header from '@/app/_components/header/Header';
import { useParams } from 'next/navigation';

export default function ForgotPasswordPage() {
  const params = useParams();
  const locale = params.locale as string;

  return (
    <>
      <Header locale={locale} />
      <div className="bg-white px-4 py-16 flex items-center justify-center flex-1">
        <CustomCard className="w-full md:border max-w-md p-8">
          <ForgotPassword />
        </CustomCard>
      </div>
    </>
  );
}

