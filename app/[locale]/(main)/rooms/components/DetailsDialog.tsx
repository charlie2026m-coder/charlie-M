import Image from 'next/image'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/app/_components/ui/dialog'

interface DetailsDialogProps {
  title: string;
  image: string;
  description: string;
  open: boolean;
  setOpen: (open: boolean) => void;
}

const DetailsDialog = ({ title, image, description, open, setOpen }: DetailsDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className='max-w-[90%] lg:max-w-[900px] px-3 w-full px-5 md:px-10 xl:px-25 pb-22'>
        <DialogHeader>
          <DialogTitle className='text-2xl font-semibold text-center'>
            {title}
          </DialogTitle>
        </DialogHeader>
        <Image className='w-full h-[300px] object-cover rounded-lg mb-5' src={image} alt={title} width={600} height={300} />
        <p className='text-mute '>{description}</p>
      </DialogContent>
    </Dialog>
  )
}

export default DetailsDialog