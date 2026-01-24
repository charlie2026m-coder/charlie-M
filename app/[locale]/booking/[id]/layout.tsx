import Header from '@/app/_components/header/Header'
const BookingLayout = async ({ children, params }: { children: React.ReactNode, params: Promise<{ locale: string }> }) => {
  const { locale } = await params
  return (
    <>
      <Header locale={locale} />
      <section className='container px-4 md:px-10 xl:px-[100px] pt-8'>
        {children}
      </section>
    </>
  )
}

export default BookingLayout