import { useProfile } from "@/app/hooks/useProfile";
import { cn } from "@/lib/utils";
import { AiOutlineUser } from "react-icons/ai";
import { Link } from "@/navigation";
import { useTranslations } from "next-intl";

/**
 * The way into the guest's own account, in the header.
 *
 * It used to be a filled circle with one letter in it and nothing else. A
 * letter is not a label: guests could not tell it apart from a decoration,
 * and the one thing behind it — their bookings — was the hardest thing on
 * the header to find. The circle stays as the face, but the word is beside
 * it now, styled like "Check In": no fill, no border, just the word.
 *
 * `size='lg'` is the mobile menu's variant, where the circle stands alone
 * among items that already carry their own labels.
 */
export default function ProfileInfo({ isWhite = false, onClick, size = 'sm' }: { isWhite?: boolean; onClick?: () => void; size?: 'sm' | 'lg' }) {
  const { profile } = useProfile();
  const t = useTranslations();

  const firstLetter = profile?.name?.charAt(0);
  const big = size === 'lg';

  return (
    <Link
      href="/profile/reservations"
      onClick={onClick}
      className={cn(
        "group flex cursor-pointer items-center gap-2 rounded-full transition-colors",
        big ? "p-0" : "py-1 pl-1 pr-3",
        isWhite ? "text-white hover:text-white/70" : "text-mute hover:text-dark-gold",
      )}
    >
      <span
        className={cn(
          "flex items-center justify-center rounded-full border bg-blue text-mute uppercase",
          big ? "size-12 text-lg" : "size-9 text-sm",
          isWhite ? "border-white bg-white" : "border-blue",
        )}
      >
        {firstLetter || <AiOutlineUser className={big ? "size-6" : "size-5"} />}
      </span>
      {!big && <span className="text-lg underline">{t('profile_btn')}</span>}
    </Link>
  )
}
