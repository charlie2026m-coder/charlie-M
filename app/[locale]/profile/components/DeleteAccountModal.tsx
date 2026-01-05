'use client'
import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/_components/ui/dialog'
import { Button } from '@/app/_components/ui/button'
import { Checkbox } from '@/app/_components/ui/checkbox'
import { useDeleteAccount } from '@/app/hooks/useAuth'
import { IoWarningOutline } from 'react-icons/io5'

interface DeleteAccountModalProps {
  isOpen: boolean
  onClose: () => void
}

const DeleteAccountModal = ({ isOpen, onClose }: DeleteAccountModalProps) => {
  const [confirmText, setConfirmText] = useState('')
  const [understand, setUnderstand] = useState(false)
  const deleteAccountMutation = useDeleteAccount()

  const handleDelete = async () => {
    if (!understand) {
      return
    }

    if (confirmText.toLowerCase() !== 'delete') {
      return
    }

    await deleteAccountMutation.mutateAsync()
  }

  const handleClose = () => {
    if (deleteAccountMutation.isPending) return
    setConfirmText('')
    setUnderstand(false)
    onClose()
  }

  const isValid = understand && confirmText.toLowerCase() === 'delete'

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className='px-5 md:px-8 py-6 rounded-4xl w-full max-w-[95%] md:max-w-[500px]'>
        <DialogHeader>
          <div className='flex items-center gap-3 mb-2'>
            <IoWarningOutline className='text-red text-3xl' />
            <DialogTitle className='text-2xl font-bold text-red'>Delete Account</DialogTitle>
          </div>

        </DialogHeader>

        <div className='space-y-5 mt-4'>


          {/* Type DELETE to confirm */}
          <div>
            <label className='text-sm font-medium text-gray-700 mb-2 block'>
              Type <span className='font-bold text-red'>DELETE</span> to confirm
            </label>
            <input
              type='text'
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder='DELETE'
              className='w-full px-4 py-3 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red/50'
              disabled={deleteAccountMutation.isPending}
            />
          </div>

          {/* Checkbox Confirmation */}
          <div className='flex items-start gap-3'>
            <Checkbox
              id='understand'
              checked={understand}
              onCheckedChange={(checked) => setUnderstand(checked === true)}
              disabled={deleteAccountMutation.isPending}
              className={understand ? 'border-red data-[state=checked]:bg-red' : ''}
            />
            <label
              htmlFor='understand'
              className='text-sm text-gray-700 cursor-pointer leading-relaxed'
            >
              I understand that this action is permanent and irreversible. My account and all associated data will be deleted.
            </label>
          </div>

          {/* Buttons */}
          <div className='flex gap-3 pt-2'>
            <Button
              type='button'
              variant='outline'
              onClick={handleClose}
              disabled={deleteAccountMutation.isPending}
              className='flex-1 h-12 rounded-full border-gray-300 hover:bg-gray-100'
            >
              Cancel
            </Button>
            <Button
              type='button'
              onClick={handleDelete}
              disabled={!isValid || deleteAccountMutation.isPending}
              className='flex-1 h-12 rounded-full bg-red hover:bg-red/90 text-white disabled:opacity-50 disabled:cursor-not-allowed'
            >
              {deleteAccountMutation.isPending ? 'Deleting...' : 'Delete Account'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default DeleteAccountModal

