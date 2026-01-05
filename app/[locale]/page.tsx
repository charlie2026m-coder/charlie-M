import PosterSection from '@/app/_components/Home/PosterSection';
import RoomsSection from '@/app/_components/Home/RoomsSection';
import WhySection from '@/app/_components/Home/WhySection';
import VibeSection from '@/app/_components/Home/VibeSection';
import FAQSection from '@/app/_components/Home/FAQSection';
import ReviewsSection from '@/app/_components/Home/ReviewsSection';
import CheckInSection from '@/app/_components/Home/CheckInSection';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function Home({ params }: Props) {
  const { locale } = await Promise.resolve(params);

  return (
      <section className="flex flex-col  pt-[50px] ">
        <div className='container px-4 xl:px-[100px]'>
          <PosterSection />
          <RoomsSection locale={locale} />
          <WhySection locale={locale} />
        </div>
          <VibeSection locale={locale} />
          <FAQSection />
          <ReviewsSection />
          <CheckInSection />
      </section>
  );
}
