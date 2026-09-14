import { useProfile } from "@/app/hooks/useProfile";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { AiOutlineUser } from "react-icons/ai";
import { Link } from "@/navigation";

/**
 * The way into the guest's own account, in the header.
 *
 * A pill that says what it is. The bare initial in a circle — "c" — read as a
 * mystery button next to "Book now", so the initial keeps its badge and the
 * word sits beside it, at the same height as the buttons around it. Glassy
 * over the hero video, outlined on the light header. Same shape as Prenzl
 * Place's, so the two hotels' headers behave alike.
 */
export default function ProfileInfo({ isWhite = false, onClick, size = 'sm' }: { isWhite?: boolean; onClick?: () => void; size?: 'sm' | 'lg' }) {
  const { profile } = useProfile();
  const t = useTranslations();

  const firstLetter = profile?.name?.charAt(0);
  const label = t('profile_btn');
  const lg = size === 'lg';

  return (
    <Link
      href="/profile/reservations"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "group inline-flex cursor-pointer items-center rounded-full border transition-colors duration-300",
        lg ? "h-12 gap-2.5 pl-1.5 pr-5" : "h-[44px] gap-2 pl-1.5 pr-4",
        isWhite
          ? "border-white/70 bg-white/25 text-white backdrop-blur-sm hover:bg-white/40"
          : "border-mute/30 bg-transparent text-mute hover:border-mute/60 hover:bg-mute/5",
      )}
    >
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full font-semibold uppercase leading-none",
          lg ? "size-9 text-base" : "size-8 text-[13px]",
          isWhite ? "bg-white/90 text-mute" : "bg-blue text-mute",
        )}
      >
        {firstLetter || <AiOutlineUser className={lg ? "size-5" : "size-4"} />}
      </span>
      <span className={cn("whitespace-nowrap font-medium", lg ? "text-base" : "text-sm")}>{label}</span>
    </Link>
  )
}
