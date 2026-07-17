import { Hero } from "./components/Hero";
import { HowItWorks } from "./components/HowItWorks";
import { RoomDirections } from "./components/RoomDirections";
import { NeedHelp } from "./components/NeedHelp";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function WelcomePage({ params }: Props) {
  const { locale } = await Promise.resolve(params);

  return (
    <>
      <Hero locale={locale} />
      <HowItWorks locale={locale} />
      <RoomDirections locale={locale} />
      <NeedHelp locale={locale} />
    </>
  );
}
