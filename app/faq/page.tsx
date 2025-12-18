import Content from "./components/Content"

const FAQPage = () => {
  return (
    <div className='container flex flex-1 flex-col min-h-[500px]  px-4 md:px-10 xl:px-25 pt-10 lg:pt-15 pb-10 lg:pb-15'>
      <h1 className='text-3xl text-mute md:text-6xl font-bold jakarta mb-20 text-center'>Frequently Asked Questions</h1>

      {/* FAQ content section client-component */}
      <Content />
    </div>  
  )
}

export default FAQPage


