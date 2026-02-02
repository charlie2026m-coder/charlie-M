import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./dialog"
import { cn } from "@/lib/utils"
export function CustomDialog({ 
  trigger, 
  content, 
  title, 
  open, 
  setOpen,
  className
}: { 
  trigger: React.ReactNode, 
  content: React.ReactNode, 
  title: string, 
  open: boolean, 
  setOpen: (open: boolean) => void,
  className?: string
}) {
  return (
    <Dialog open={open} onOpenChange={(open) => setOpen(open)}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className={cn('px-4 lg:px-10 xl:px-[100px] !rounded-[30px] w-[95%] max-w-[900px]', className)}>
        <DialogHeader>
          <DialogTitle className='text-center text-xl font-semibold'>{title}</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  )
}
