import { useProfile } from "@/app/hooks/useProfile";
import { cn } from "@/lib/utils";
import { AiOutlineUser } from "react-icons/ai";
import { Link } from "@/navigation";

export default function ProfileInfo({ isWhite = false }: { isWhite?: boolean }) {
  const { profile } = useProfile();

  const forstLetter = profile?.name?.charAt(0) ;
  return (
    <Link href="/profile" className={cn("flex items-center justify-center border border-mute size-10 rounded-full cursor-pointer group text-mute", isWhite ? "border-white bg-white" : "border-black")}>
      <span className={cn("group-hover:scale-140 transition-all duration-300")}>{forstLetter || <AiOutlineUser className="size-5" />}</span>
    </Link>
  )
}