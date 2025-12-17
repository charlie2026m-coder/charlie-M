import Image from "next/image";
import Link from "next/link";
import { useProfile } from "@/app/hooks/useProfile";
import { useAvatar } from "@/app/hooks/useAvatar";
export default function ProfileInfo() {
  const { profile } = useProfile();
  const { avatarUrl } = useAvatar();

  return (
    <div className="flex items-center gap-2 pl-3">
      <Image 
        src={avatarUrl || "/images/cat-icon.jpg"} 
        alt="profile photo" 
        width={44} 
        height={44}
        className="rounded-full object-cover size-11"
      />
      <div className="flex flex-col">
        <span className="text-[18px] md:text-[13px] text-white md:text-black">{profile?.name || 'John Week'}</span>
        <Link href="/profile" className="text-xs text-blue md:text-brown hover:text-brown/50">Open profile</Link>
      </div>
    </div>
  );
}