import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { ImageLightbox } from "./ImageLightbox";
import { Reveal } from "./Reveal";

// NOTE: placeholder / generic directions. Charlie M's building-specific
// wayfinding (floors, room-number ranges, corridor photos) still needs real
// content + photos from the hotel — swap the steps, image and copy below once
// available (mirror Motz19's two-card floor layout if wanted).
const STEP_ICONS = [
  { src: "/images/door-icon.svg", alt: "Door Icon" },
  { src: "/images/steps-icon.svg", alt: "Steps Icon" },
  { src: "/images/pin-icon.svg", alt: "Pin Icon" },
  { src: "/images/right-arrow-icon.svg", alt: "Right Arrow" },
] as const;

const ICON_CLASS = "object-contain lg:size-[23px]";

export const RoomDirections = async ({ locale }: { locale: string }) => {
  const t = await getTranslations({ locale, namespace: "welcomePage" });

  const stepKeys = ["enterMainEntrance", "goToYourFloor", "enterPinCorridor", "followSignage"] as const;

  const steps = stepKeys.map((key, i) => ({
    icon: (
      <Image
        src={STEP_ICONS[i].src}
        alt={STEP_ICONS[i].alt}
        width={23}
        height={23}
        className={ICON_CLASS}
      />
    ),
    text: t(`roomDirections.${key}`),
  }));

  return (
    <section className="container px-[25px] lg:px-[100px] py-8 lg:py-[70px]">
      <Reveal>
        <h2 className="text-dark text-[24px] lg:text-[50px] font-medium text-center mb-3 lg:mb-4">
          {t("roomDirections.title")}
        </h2>
        <p className="text-[#6e6e6e] text-[16px] lg:text-[20px] text-center mb-6 lg:mb-[63px] max-w-2xl mx-auto text-balance">
          {t("roomDirections.intro")}
        </p>
      </Reveal>

      <Reveal className="flex justify-center">
        <div className="bg-white rounded-[10px] lg:rounded-[20px] overflow-hidden shadow-[0px_5px_20px_0px_rgba(0,0,0,0.14)] w-full lg:max-w-[505px] flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-[0px_16px_40px_0px_rgba(0,0,0,0.18)]">
          <ImageLightbox src="/images/room-ex-2.webp" alt={t("roomDirections.title")} />

          <div className="flex flex-col gap-[13px] lg:gap-[15px] px-[18px] lg:px-[25px] py-[16px] lg:py-6">
            <div>
              <h3 className="text-dark-gold text-[25px] lg:text-[26px] font-bold leading-snug">
                {t("roomDirections.cardTitle")}
              </h3>
              <p className="text-[#6e6e6e] text-[16px]">{t("roomDirections.afterMainEntrance")}</p>
            </div>

            <div className="flex flex-col gap-[13px] lg:gap-3">
              {steps.map((step, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="shrink-0 size-[36px] lg:size-[42px] flex items-center justify-center rounded-full bg-light-bg">
                    {step.icon}
                  </div>
                  <span className="text-dark text-[17px] lg:text-[18px] font-medium">
                    {step.text}
                  </span>
                </div>
              ))}
            </div>

            <p className="text-[#6e6e6e] text-[14px] italic mt-1">
              {t("roomDirections.note")}
            </p>
          </div>
        </div>
      </Reveal>
    </section>
  );
};
