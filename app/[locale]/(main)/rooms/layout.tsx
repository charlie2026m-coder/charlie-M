import Header from "@/app/_components/header/Header"
const RoomsLayout = async ({ children, params }: { children: React.ReactNode, params: Promise<{ locale: string }> }) => {
  const { locale } = await params
  return (
    <>
      <Header locale={locale} />    
      <section className='flex flex-col container px-4 md:px-10 xl:px-[100px] pt-3'>
        {children}
      </section>
    </>
  )
}

export default RoomsLayout