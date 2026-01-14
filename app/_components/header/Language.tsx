"use client";
import { useState, useTransition, useId } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/navigation';
import { useSearchParams } from 'next/navigation';
import { Button } from '../ui/button';
import { ImEarth } from "react-icons/im";
import { cn } from '@/lib/utils';
type Locale = 'en' | 'de';

export default function Language({ isWhite = false }: { isWhite?: boolean }) {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const languages: Array<{ code: Locale; label: string }> = [
    { code: "en", label: "ENG" },
    { code: "de", label: "GER" }
  ];

  const handleLanguageChange = (newLocale: Locale) => {
    if (newLocale === locale) return;
    
    setOpen(false);
    
    startTransition(() => {
      // Preserve query parameters when switching language
      const queryString = searchParams.toString();
      const newPath = queryString ? `${pathname}?${queryString}` : pathname;
      router.push(newPath, { locale: newLocale });
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button 
          className="flex items-center gap-1 cursor-pointer w-10 items-center justify-center xl:ml-4"
          disabled={isPending}
          suppressHydrationWarning
        >
          <ImEarth className={cn('size-5', isWhite ? 'text-white' : 'text-black')} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 overflow-hidden" align="end">
        <div className="flex flex-col">
          {languages.map((lang) => (
            <Button
              variant="ghost"
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              size="sm"
              disabled={isPending}
              className={`rounded-none px-4 h-[50px] ${locale === lang.code && 'bg-blue hover:bg-blue/80'}`}
            >
              <span>{lang.label}</span>
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
