import { getTranslations } from "next-intl/server";
import Image from "next/image";
import CheckInDialog from "../../../_components/header/CheckInDialog";
import { Button } from "../../../_components/ui/button";

const HOW_IT_WORKS_STEPS = ["1", "2", "3", "4", "5"] as const;

export const HowItWorks = async ({ locale }: { locale: string }) => {
  const t = await getTranslations({ locale, namespace: "welcomePage" });

  return (
    <section className="container px-[18px] lg:px-[100px] pt-[29px] lg:pt-[70px]">
      <div className="flex flex-col items-center text-center gap-[15px] lg:gap-5 mb-[29px] lg:mb-[52px]">
        <h2 className="text-dark text-[24px] lg:text-[50px] font-medium leading-tight">
          {t("intro.title")}
        </h2>
        <div className="flex flex-col text-left lg:text-center text-[#6e6e6e] text-[16px] lg:text-[20px]">
          <p>{t("intro.description1")}</p>
          <p>{t("intro.description2")}</p>
          <p>{t("intro.description3")}</p>
        </div>
      </div>

      <div className="flex flex-col items-center gap-[29px] lg:gap-[53px]">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-[58px] items-start">
          <div className="order-last lg:order-first w-full aspect-square lg:w-[503px] lg:h-[636px] lg:aspect-auto shrink-0 rounded-[30px] overflow-hidden">
            <Image
              src="/images/room-ex.webp"
              alt="Door lock keypad"
              width={503}
              height={636}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="flex flex-col gap-[18px] w-full">
            <h3 className="text-dark text-[21px] lg:text-[35px] font-medium text-center lg:text-left">
              {t("howItWorks.title")}
            </h3>
            <div className="flex flex-col">
              {HOW_IT_WORKS_STEPS.map((step, index) => (
                <div
                  key={step}
                  className="flex gap-[18px] items-start py-2 lg:py-3 relative"
                >
                  {index < HOW_IT_WORKS_STEPS.length - 1 && (
                    <div className="absolute left-[17px] lg:left-[23px] top-[25px] lg:top-[35px] bottom-[-25px] lg:bottom-[-35px] w-px bg-dark-gold/30" />
                  )}
                  <div className="shrink-0 w-[35px] h-[35px] lg:w-[47px] lg:h-[47px] rounded-full bg-dark-gold flex items-center justify-center text-white font-medium text-[20px] z-10">
                    {step}
                  </div>
                  <div className="flex flex-col gap-3.5 lg:gap-[22px] pt-1">
                    <p className="text-dark text-[18px] lg:text-[22px] font-medium leading-5">
                      {t(`howItWorks.step${step}.title`)}
                    </p>

                    <p
                      className="welcome-step-desc text-[#6e6e6e] text-[16px] lg:text-[19px] leading-5"
                      dangerouslySetInnerHTML={{
                        __html: t.raw(`howItWorks.step${step}.description`),
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <CheckInDialog
          trigger={
            <Button
              variant="outline"
              className="flex lg:inline-flex items-center justify-center w-full lg:w-auto h-[58px] lg:h-[43px] lg:p-2.5 bg-dark-gold text-white border-dark-gold rounded-[7px] text-[17px] font-medium hover:bg-dark-gold/90 hover:text-white transition-colors"
            >
              {t("howItWorks.cta")}
            </Button>
          }
        />
      </div>
    </section>
  );
};
