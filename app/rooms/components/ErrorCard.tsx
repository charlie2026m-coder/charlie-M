import Link from 'next/link'
import { Button } from '@/app/_components/ui/button'

const ErrorCard = ({
  link,
  isSingleRoom = false,
}: {
  link?: string
  isSingleRoom?: boolean
}) => {
  return (
    <div className='container px-[100px] py-20 text-center'>
      <h2 className='text-2xl font-bold text-gray-700 mb-4'>We couldn't show the {isSingleRoom ? 'room' : 'rooms'} right now. Please try again.</h2>
      <p className=' mb-6'>We working on it. Please try again later</p>
     {isSingleRoom && link && <Link href={link} className='text-blue hover:underline'>
        <Button variant='outline'>
          ← Back to all rooms
        </Button>
      </Link>}
    </div>
  )
}

export default ErrorCard