import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./dialog"

export function CustomDialog({ 
  trigger, 
  content, 
  title, 
  open, 
  setOpen 
}: { 
  trigger: React.ReactNode, 
  content: React.ReactNode, 
  title: string, 
  open: boolean, 
  setOpen: (open: boolean) => void 
}) {
  return (
    <Dialog open={open} onOpenChange={(open) => setOpen(open)}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className='px-4 lg:px-10 xl:px-[100px] !rounded-[30px]'>
        <DialogHeader>
          <DialogTitle className='text-center text-xl font-semibold'>{title}</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  )
}
