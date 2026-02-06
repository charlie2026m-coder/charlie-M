const RoomsFallback = () => {
  return (
    <div id="rooms" className='w-full flex flex-col py-15'>
      <div className="container px-2 xl:px-0">
        <div className="flex gap-10 md:px-30">
          {[1, 2, 3].map((i) => (
            <div 
              key={i} 
              className={`w-full flex flex-col rounded-[40px] bg-gray-200 overflow-hidden shadow-lg h-full animate-pulse shrink-0 ${
                i === 1 
                  ? 'basis-full md:basis-1/2 lg:basis-1/3' 
                  : i === 2 
                    ? 'hidden md:block md:basis-1/2 lg:basis-1/3' 
                    : 'hidden lg:block lg:basis-1/3'
              }`}
            >
              <div className="w-full h-[260px] bg-gray-300" />
              <div className='flex flex-col p-4 pb-6 h-full gap-3'>
                <div className="w-3/4 h-6 bg-gray-300 rounded" />
                <div className="w-full h-4 bg-gray-300 rounded" />
                <div className="w-1/2 h-4 bg-gray-300 rounded mt-auto" />
                <div className="flex gap-2 mt-5">
                  <div className="w-24 h-[50px] bg-gray-300 rounded" />
                  <div className="flex-1 h-[50px] bg-gray-300 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default RoomsFallback
