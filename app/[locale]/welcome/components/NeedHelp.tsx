import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { PHONE_NUMBER, WHATSAPP_NUMBER } from "@/lib/Constants";

export const NeedHelp = async ({ locale }: { locale: string }) => {
  const t = await getTranslations({ locale, namespace: "welcomePage" });

  return (
    <footer className="bg-dark-gold w-full relative overflow-hidden">
      <div className="container px-[18px] lg:px-[105px] pt-[41px] lg:pt-16 pb-20 lg:pb-[70px] flex flex-col lg:flex-row gap-[27px] lg:gap-[88px] items-start lg:items-center">
        <div className="flex flex-col gap-[27px] text-white w-full lg:w-[533px] shrink-0">
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-8">
              <h2 className="text-white text-[24px] lg:text-[50px] font-[550] leading-[normal]">
                {t("needHelp.title")}
              </h2>
              <p className="text-white text-[16px] lg:text-[20px] leading-5 font-[550]">
                {t("needHelp.description")}
              </p>
            </div>

            <div className="flex flex-col gap-[15px]">
              <a
                href={`tel:${PHONE_NUMBER.replace(/\D/g, '')}`}
                className="flex items-center gap-[7px] border border-white rounded-[5px] px-[13px] h-[58px] text-white hover:bg-white/10 transition-colors w-full lg:w-[300px]"
              >
                <div className="size-6 flex items-center justify-center shrink-0">
                  <Image
                    src="/images/welcome-phone-icon.svg"
                    alt="Phone Icon"
                    width={20}
                    height={20}
                    className="object-contain"
                  />
                </div>
                <span className="text-[17px] lg:text-[19px] font-black">
                  {PHONE_NUMBER}
                </span>
              </a>

              <a
                href={`https://wa.me/${WHATSAPP_NUMBER.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-[7px] border border-white rounded-[5px] px-[13px] h-[58px] text-white hover:bg-white/10 transition-colors w-full lg:w-[300px]"
              >
                <div className="size-6 flex items-center justify-center shrink-0">
                  <Image
                    src="/images/welcome-whatsup-icon.svg"
                    alt="WhatsApp Icon"
                    width={20}
                    height={20}
                    className="object-contain"
                  />
                </div>
                <span className="text-[17px] lg:text-[19px] font-medium">
                  {t("needHelp.whatsapp")}
                </span>
              </a>

              <a
                href={`mailto:${t("needHelp.email")}`}
                className="flex items-center gap-[7px] border border-white rounded-[5px] px-[13px] h-[58px] text-white hover:bg-white/10 transition-colors w-full lg:w-[300px]"
              >
                <div className="size-6 flex items-center justify-center shrink-0">
                  <Image
                    src="/images/welcome-message-icon.svg"
                    alt="Email Icon"
                    width={20}
                    height={20}
                    className="object-contain"
                  />
                </div>
                <span className="text-[17px] lg:text-[19px] font-black">
                  {t("needHelp.email")}
                </span>
              </a>
            </div>
          </div>

          <p className="text-white font-black text-[17px] lg:text-[20px] leading-5">
            {t("needHelp.footer")}
          </p>
        </div>

        <div className="w-[340px] h-[340px] lg:w-[610px] lg:h-[442px] rounded-[30px] overflow-hidden mx-auto lg:mx-0 shrink-0">
          <Image
            src="/images/room-ex-2.webp"
            alt="Guest support"
            width={610}
            height={442}
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </footer>
  );
};
