
const NotFoundCard = ({
  text,
}: {
  text: string
}) => {
  return (
    <div className='container px-[100px] py-20 text-center'>
      <h2 className='text-2xl font-bold text-gray-700 mb-4'>{text}</h2>
    </div>
  )
}

export default NotFoundCard