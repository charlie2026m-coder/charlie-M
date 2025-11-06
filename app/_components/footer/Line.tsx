'use client';
import { FaHeart } from "react-icons/fa";

export default function Line() {
  const content = (
    <>
      <span className="text-3xl font-bold whitespace-nowrap">Freedom meets comfort</span>
      <FaHeart size={30} className="mx-4 flex-shrink-0" />
    </>
  );

  return (
    <div className="w-full bg-blue py-3 overflow-hidden">
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