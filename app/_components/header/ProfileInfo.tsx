import { useProfile } from "@/app/hooks/useProfile";
import { cn } from "@/lib/utils";
import { AiOutlineUser } from "react-icons/ai";
import { Link } from "@/navigation";

export default function ProfileInfo({ isWhite = false }: { isWhite?: boolean }) {
  const { profile } = useProfile();

  const forstLetter = profile?.name?.charAt(0) ;
  return (
    <Link href="/profile/reservations" className={cn("flex items-center justify-center border border-mute bg-blue size-10 rounded-full cursor-pointer group text-mute", isWhite ? "border-white bg-white" : "border-blue hover:bg-dark-gold hover:text-white")}>
      <span className={cn(" transition-all duration-300")}>{forstLetter || <AiOutlineUser className="size-5" />}</span>
    </Link>
  )
}