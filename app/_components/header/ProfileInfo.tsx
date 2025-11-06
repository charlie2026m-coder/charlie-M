import Image from "next/image";
import Link from "next/link";
export default function ProfileInfo() {
  return (
    <div className="flex items-center gap-2 pl-3">
      <Image 
        src="/images/ProfilePhoto.png" 
        alt="profile photo" 
        width={44} 
        height={44}
        className="rounded-full object-cover size-11"
      />
      <div className="flex flex-col">
        <span className="text-sm">John Davidson</span>
        <Link href="/profile" className="text-xs text-brown hover:text-brown/50">Open profile</Link>
      </div>
    </div>
  );
}