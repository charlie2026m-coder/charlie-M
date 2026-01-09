import { useProfile } from "@/app/hooks/useProfile";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
export default function ProfileInfo({ isWhite = false }: { isWhite?: boolean }) {
  const t = useTranslations();
  const { profile } = useProfile();

  const forstLetter = profile?.name?.charAt(0);
  return (
    <div className={cn("flex items-center justify-center border size-10 rounded-full cursor-pointer group", isWhite ? "border-white bg-white text-transparent" : "border-black  text-black")}>
      <span className={cn("group-hover:scale-140 transition-all duration-300")}>{forstLetter}</span>
    </div>
  )
}