import { getTranslations } from "next-intl/server";
import { MdLockOutline } from "react-icons/md";
import Image from "next/image";
import CheckInDialog from "../../../_components/header/CheckInDialog";
import WelcomeHeader from "../../../_components/header/WelcomeHeader";
import { Button } from "../../../_components/ui/button";

export const Hero = async ({ locale }: { locale: string }) => {
  const t = await getTranslations({ locale, namespace: "welcomePage.hero" });

  return (
    <section className="relative w-full min-h-[460px] lg:min-h-[640px] flex flex-col">
      <Image
        src="/images/room1.webp"
        alt="Charlie M Aparthotel Berlin"
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-black/50" />
      <WelcomeHeader locale={locale} />

      <div className="relative z-10 flex flex-col items-center gap-[34px] text-center px-4 max-w-4xl mx-auto w-full pt-[109px] pb-12 lg:pt-[201px] lg:pb-20">
        <div className="flex flex-col gap-[29px] items-center w-full">
          <div className="flex gap-2.5 text-white md:items-center">
            <MdLockOutline size={24} className="min-w-6 mt-3 md:mt-0" />
            <span className="text-[28px] lg:text-[36px] font-medium text-start">
              {t("badge")}
            </span>
          </div>

          <div className="flex flex-col gap-[29px] items-center w-full">
            <h1 className="text-white text-[30px] lg:text-[50px] font-[550] leading-tight">
              {t("title")}
            </h1>
            <p className="text-white text-[18px] lg:text-[20px]">
              {t("subtitle")}
            </p>
          </div>
        </div>

        <CheckInDialog
          trigger={
            <Button
              variant="outline"
              className="inline-flex items-center justify-center w-[250px] h-[58px] lg:w-auto lg:h-[43px] lg:p-2.5 bg-dark-gold text-white border-dark-gold rounded-[7px] text-[17px] font-medium hover:bg-dark-gold/90 hover:text-white transition-colors"
            >
              {t("cta")}
            </Button>
          }
        />
      </div>
    </section>
  );
};
