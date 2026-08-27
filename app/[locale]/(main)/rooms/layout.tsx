import Header from "@/app/_components/header/Header"
const RoomsLayout = async ({ children, params }: { children: React.ReactNode, params: Promise<{ locale: string }> }) => {
  const { locale } = await params
  return (
    <>
      <Header locale={locale} />    
      <section className='flex flex-col container px-4 md:px-10 xl:px-[100px] pt-3'>
        {/* The listing had no <h1> at all — neither in the browse view nor in
            the dated-results view — so its subject was never stated for search
            engines or screen readers. It lives in the layout because that is the
            one place both views pass through.

            Written inline rather than through next-intl: the message files are
            keyed by array index in places, and adding entries there has broken
            unrelated strings before. Two words do not justify that risk.

            sr-only keeps the page looking exactly as it does today. */}
        <h1 className='sr-only'>
          {locale === 'de'
            ? 'Zimmer und Suiten in Berlin-Mitte'
            : 'Rooms and suites in Berlin-Mitte'}
        </h1>
        {children}
      </section>
    </>
  )
}

export default RoomsLayout