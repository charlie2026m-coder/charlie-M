"use client";
import { Link, usePathname } from "@/navigation";
import { Button } from "../ui/button";
import Language from "./Language";
import { useAuth } from "@/lib/auth-provider";
import Image from "next/image";
import { TbMenu2 } from "react-icons/tb";
import {
  Bed,
  Calendar,
  CircleHelp,
  KeyRound,
  Lightbulb,
  LogOut,
  Mail,
  MapPin,
  Users,
  XIcon,
} from "lucide-react";
import { AiOutlineUser } from "react-icons/ai";
import { useState } from "react";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
} from "../ui/sheet";
import { VisuallyHidden } from "../ui/visually-hidden";
import { useProfile } from "@/app/hooks/useProfile";
import { useTranslations, useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import { EMAIL } from "@/lib/Constants";
import { Suspense } from "react";
import CheckInDialog from "./CheckInDialog";
import Logout from "@/app/[locale]/(protected)/profile/components/Logout";
import type { LucideIcon } from "lucide-react";

const navLinkClassName = "text-dark";

function IconLabelRow({
  icon: Icon,
  label,
  iconClassName = "size-[18px]",
  textClassName = "text-[18px] leading-[18px]",
  gapClassName = "gap-2.5",
}: {
  icon: LucideIcon;
  label: string;
  iconClassName?: string;
  textClassName?: string;
  gapClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center", gapClassName)}>
      <Icon
        className={cn("shrink-0", iconClassName)}
        strokeWidth={1.5}
        aria-hidden
      />
      <span className={cn(textClassName, "translate-y-[1.5px]")}>{label}</span>
    </span>
  );
}

const menuOutlineButtonClassName =
  "flex h-[55px] w-full items-center justify-center gap-2 rounded-full border border-mute bg-white text-base font-medium text-mute shadow-none hover:bg-white hover:text-mute active:bg-white";

const MobileMenu = ({ isWhite = false }: { isWhite?: boolean }) => {
  const { profile } = useProfile();
  const t = useTranslations();
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const { user, loading } = useAuth();
  const pathname = usePathname();

  const links: {
    label: string;
    href: string;
    icon: LucideIcon;
    external?: boolean;
  }[] = [
    {
      label: t("header.rooms_link"),
      href: "/rooms",
      icon: Bed,
    },
    {
      label: t("header.about_us_link"),
      href: "/#concept",
      icon: Lightbulb,
    },
    {
      label: t("header.location_link"),
      href: "/#location",
      icon: MapPin,
    },
    {
      label: "FAQ",
      href: "/#faq",
      icon: CircleHelp,
    },
    {
      label: t("header.group_bookings_link"),
      href: "/group-bookings",
      icon: Users,
    },
    {
      label: t("header.contactUs"),
      href: `mailto:${EMAIL}`,
      icon: Mail,
      external: true,
    },
  ];

  const displayName =
    [profile?.name, profile?.last_name].filter(Boolean).join(" ") || "Guest";

  const handleLinkClick = (href: string) => {
    setOpen(false);
    if (pathname === "/") {
      const sectionId = href.replace("/#", "");
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  const checkInTrigger = (
    <Button variant="outline" className={menuOutlineButtonClassName}>
      <IconLabelRow
        icon={Calendar}
        label={t("check_in_btn")}
        iconClassName="size-4"
        textClassName="text-base leading-4"
        gapClassName="gap-2"
      />
    </Button>
  );

  return (
    <>
      <TbMenu2
        className={cn(
          "size-8 md:hidden mr-3",
          isWhite ? "text-white" : "text-black",
        )}
        onClick={() => setOpen(true)}
      />

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          swipeToClose
          className="p-0 border-none bg-white h-screen rounded-r-[30px]"
        >
          <VisuallyHidden>
            <SheetTitle>Mobile Menu</SheetTitle>
          </VisuallyHidden>

          <div
            data-sheet-scroll
            className="flex flex-col h-full overflow-y-auto touch-pan-y bg-white"
          >
            <div className="flex flex-col">
              <div className="flex justify-end pt-5 pr-3">
                <SheetClose asChild>
                  <button
                    type="button"
                    aria-label="Close menu"
                    className="size-8 cursor-pointer flex items-center justify-center"
                  >
                    <XIcon className="size-8" />
                  </button>
                </SheetClose>
              </div>
              <div className="flex items-start justify-between px-5 mt-[26px]">
                <Link href="/" onClick={() => setOpen(false)}>
                  <Image
                    src="/images/Logo.svg"
                    alt="logo"
                    width={163}
                    height={104}
                    priority
                    className="w-[163px]"
                  />
                </Link>
                <label className="flex items-center relative cursor-pointer mt-2">
                  <Suspense fallback={<div className="size-10" />}>
                    <span className="text-base tracking-wide font-medium">
                      {locale === "en" ? "ENG" : "GER"}
                    </span>
                    <span className="ml-1 text-[22px]">▾</span>
                    <span className="opacity-0 absolute inset-0">
                      <Language />
                    </span>
                  </Suspense>
                </label>
              </div>
            </div>

            <nav className="mt-8 flex w-full flex-col items-start gap-6 px-5">
              {links.map((item) => {
                const content = (
                  <IconLabelRow icon={item.icon} label={item.label} />
                );

                return item.external ? (
                  <a
                    key={item.href}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={navLinkClassName}
                    onClick={() => setOpen(false)}
                  >
                    {content}
                  </a>
                ) : (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={navLinkClassName}
                    onClick={() => handleLinkClick(item.href)}
                  >
                    {content}
                  </Link>
                );
              })}
            </nav>

            <div className="flex flex-col w-full px-5 pb-6 mt-10">
              <Link
                href="/rooms"
                className="w-full"
                onClick={() => setOpen(false)}
              >
                <Button className="h-[55px] w-full justify-center rounded-full text-base">
                  {t("book_now_btn")}
                </Button>
              </Link>

              {loading ? (
                <div className="mt-5 w-full [&_button]:w-full">
                  <CheckInDialog trigger={checkInTrigger} />
                </div>
              ) : !user ? (
                <div className="flex gap-3 w-full mt-5">
                  <Link
                    href="/login"
                    className="flex-1 min-w-0"
                    onClick={() => setOpen(false)}
                  >
                    <Button variant="outline" className={menuOutlineButtonClassName}>
                      <IconLabelRow
                        icon={KeyRound}
                        label={t("sign_in_btn")}
                        iconClassName="size-4"
                        textClassName="text-base leading-4"
                        gapClassName="gap-2"
                      />
                    </Button>
                  </Link>
                  <div className="min-w-0 flex-1 [&_button]:w-full">
                    <CheckInDialog trigger={checkInTrigger} />
                  </div>
                </div>
              ) : (
                <div className="mt-5 w-full [&_button]:w-full">
                  <CheckInDialog trigger={checkInTrigger} />
                </div>
              )}

              {!loading && user && (
                <>
                  <div className="border-t border-gray w-full mt-5" />
                  <div className="flex w-full items-center justify-between gap-4 pt-4">
                    <Link
                      href="/profile/reservations"
                      className="flex min-w-0 items-center gap-3"
                      onClick={() => setOpen(false)}
                    >
                      <div className="flex size-12 shrink-0 items-center justify-center rounded-full border border-blue bg-blue text-mute">
                        {profile?.name?.charAt(0) ? (
                          <span className="text-lg font-medium uppercase leading-none">
                            {profile.name.charAt(0)}
                          </span>
                        ) : (
                          <AiOutlineUser className="size-6" />
                        )}
                      </div>
                      <span className="truncate text-[17px] font-bold text-dark">
                        {displayName}
                      </span>
                    </Link>

                    <div className="shrink-0">
                      <Logout
                        onSuccess={() => setOpen(false)}
                        trigger={
                          <button
                            type="button"
                            className="flex h-12 w-11 cursor-pointer flex-col items-center justify-center rounded-lg border border-gray bg-white px-1 py-1 hover:bg-light-bg"
                            aria-label="Logout"
                          >
                            <LogOut className="size-4 text-dark" strokeWidth={1.5} />
                            <span className="mt-0.5 text-[7px] font-bold leading-none tracking-[0.12em]">
                              LOGOUT
                            </span>
                          </button>
                        }
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default MobileMenu;
