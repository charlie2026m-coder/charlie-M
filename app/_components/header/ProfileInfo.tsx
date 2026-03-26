import { useProfile } from "@/app/hooks/useProfile";
import { cn } from "@/lib/utils";
import { AiOutlineUser } from "react-icons/ai";
import { Link } from "@/navigation";

export default function ProfileInfo({ isWhite = false, onClick, size = 'sm' }: { isWhite?: boolean; onClick?: () => void; size?: 'sm' | 'lg' }) {
  const { profile } = useProfile();

  const firstLetter = profile?.name?.charAt(0);
  const sizeClass = size === 'lg' ? 'size-12 text-lg' : 'size-10';

  return (
    <Link
      href="/profile/reservations"
      onClick={onClick}
      className={cn("flex items-center justify-center border bg-blue rounded-full cursor-pointer group text-mute", sizeClass, isWhite ? "border-white bg-white" : "border-blue hover:bg-dark-gold hover:text-white")}
    >
      <span className="transition-all duration-300">{firstLetter || <AiOutlineUser className="size-5" />}</span>
    </Link>
  )
}