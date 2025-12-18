import Link from "next/link";
import { useProfile } from "@/app/hooks/useProfile";
export default function ProfileInfo() {
  const { profile } = useProfile();

  return (

      <div className="flex flex-col">
        <span className="text-[18px] md:text-[13px] text-white md:text-black">{profile?.name || 'John Week'}</span>
        <Link href="/profile" className="text-xs text-blue md:text-brown hover:text-brown/50">Open profile</Link>
      </div>
  );
}