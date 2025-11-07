'use client';
import { FaHeart } from "react-icons/fa";

export default function Line({ black }: { black?: boolean }) {
  const content = (
    <>
      <span className="text-3xl font-bold whitespace-nowrap">Freedom meets comfort</span>
      <FaHeart size={30} className={`mx-4 flex-shrink-0 ${black ? 'text-blue' : 'text-black'}`} />
    </>
  );

  return (
    <div className={`w-full ${black ? 'bg-black text-white' : 'bg-blue text-black'} py-3 overflow-hidden w-screen`}>
      <div className="flex items-center gap-4 animate-scroll-right">
        {content}
        {content}
        {content}
        {content}
        {content}
        {content}
      </div>
    </div>
  );
}