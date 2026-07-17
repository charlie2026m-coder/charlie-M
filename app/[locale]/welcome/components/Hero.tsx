import { getTranslations } from "next-intl/server";
import { MdLockOutline } from "react-icons/md";
import Image from "next/image";
import CheckInDialog from "../../../_components/header/CheckInDialog";
import WelcomeHeader from "../../../_components/header/WelcomeHeader";
import { Button } from "../../../_components/ui/button";

export const Hero = async ({ locale }: { locale: string }) => {
  const t = await getTranslations({ locale, namespace: "welcomePage.hero" });

  return (
    <section className="relative w-full min-h-[520px] lg:min-h-[640px] flex flex-col overflow-hidden">
      <Image
        src="/images/room1.webp"
        alt="Charlie M Aparthotel Berlin"
        fill
        priority
        sizes="100vw"
        className="object-cover animate-in fade-in zoom-in-105 duration-[1400ms] ease-out"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/50 to-black/65" />
      <WelcomeHeader locale={locale} />

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-8 lg:gap-[34px] text-center px-5 max-w-3xl mx-auto w-full pt-[96px] pb-14 lg:pt-[140px] lg:pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
        <div className="flex flex-col items-center gap-6 lg:gap-[29px] w-full text-white">
          <div className="inline-flex items-center gap-2 rounded-2xl border border-white/25 bg-white/10 px-4 py-2 backdrop-blur-sm">
            <MdLockOutline size={18} className="shrink-0" />
            <span className="text-[11px] sm:text-[13px] font-medium uppercase tracking-[0.08em] leading-tight">
              {t("badge")}
            </span>
          </div>

          <div className="flex flex-col gap-4 lg:gap-[29px] items-center w-full">
            <h1 className="text-white text-balance text-[26px] sm:text-[30px] lg:text-[50px] font-[550] leading-[1.15]">
              {t("title")}
            </h1>
            <p className="text-white/90 text-balance text-[16px] sm:text-[18px] lg:text-[20px] max-w-xl">
              {t("subtitle")}
            </p>
          </div>
        </div>

        <CheckInDialog
          trigger={
            <Button
              variant="outline"
              className="inline-flex items-center justify-center w-full sm:w-auto min-w-[250px] h-[56px] lg:h-[52px] px-8 bg-dark-gold text-white border-dark-gold rounded-full text-[17px] font-medium shadow-lg shadow-black/20 hover:bg-dark-gold/90 hover:text-white hover:scale-[1.02] active:scale-95 transition-all duration-200"
            >
              {t("cta")}
            </Button>
          }
        />
      </div>
    </section>
  );
};
