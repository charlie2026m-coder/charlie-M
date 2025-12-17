import PosterSection from './_components/Home/PosterSection';
import RoomsSection from './_components/Home/RoomsSection';
import WhySection from './_components/Home/WhySection';
import Line from './_components/footer/Line';
import VibeSection from './_components/Home/VibeSection';
import FAQSection from './_components/Home/FAQSection';
import ReviewsSection from './_components/Home/ReviewsSection';
import CheckInSection from './_components/Home/CheckInSection';

export default function Home() {

  return (
      <section className="flex flex-col  pt-[50px] ">
        <div className='container px-4 xl:px-[100px]'>
          <PosterSection />
          <RoomsSection />
          <WhySection />
        </div>
          <VibeSection />
          <FAQSection />
          <ReviewsSection />
          <CheckInSection />
      </section>
  );
}


