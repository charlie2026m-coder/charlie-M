import Link from "next/link";
import { useProfile } from "@/app/hooks/useProfile";
import { useTranslations } from "next-intl";
export default function ProfileInfo() {
  const t = useTranslations();
  const { profile } = useProfile();

  return (

      <div className="flex flex-col">
        <span className="text-[18px] md:text-[13px] text-white md:text-black">{profile?.name || t('header.dear_guest')}</span>
        <Link href="/profile" className="text-xs text-blue md:text-brown hover:text-brown/50">{t('header.open_profile_link')}</Link>
      </div>
  );
}