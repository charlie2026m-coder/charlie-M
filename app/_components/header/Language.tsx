"use client";
import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { useI18n } from '@/lib/i18n';
import type { Locale } from '@/i18n/config';
import { Button } from '../ui/button';

export default function Language() {
  const { locale, setLocale, t } = useI18n();
  const [open, setOpen] = useState(false);

  const languages = [
    { code: "en" as Locale },
    { code: "ge" as Locale }
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button 
          className="flex items-center gap-1 cursor-pointer w-[50px] justify-between ml-4"
        >
          <span className="rubik font-light">{locale === "en" ? "ENG" : "GER"}</span>
          <div className={`border-6 border-brown border-b-transparent border-r-transparent border-l-transparent  ${open ? 'rotate-180 -translate-y-1' : 'translate-y-1'} `}></div>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 overflow-hidden" align="end">
        <div className="flex flex-col">
          {languages.map((lang) => (
            <Button
              variant="ghost"
              key={lang.code}
              onClick={() => setLocale(lang.code)}
              size="sm"
              className={`rounded-none px-4 h-[50px]  ${ locale === lang.code && ' bg-blue hover:bg-blue/80'  }`}
            >
              <span >{lang.code === "en" ? 'ENG'  : 'GER'}</span>
            </Button>
          ))}
      </div>
    </PopoverContent>
  </Popover>
  );
}