import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import formatDuration from '@/utils/formatDuration'

interface BillBreakdownDialogProps {
  open: boolean
  onClose: () => void
  files: {
    name: string
    amount: number
    duration: number
  }[]
}

const BillBreakdownDialog = ({
  open,
  onClose,
  files,
}: BillBreakdownDialogProps) => (
  <AlertDialog open={open}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle className='mb-5'>Bill breakdown</AlertDialogTitle>
        <AlertDialogDescription>
          <div className='flex justify-between'>
            <p>File name</p>
            <p>Duration</p>
            <p>Amount</p>
          </div>
          {files.map((file) => (
            <div
              key={file.name}
              className='flex justify-between text-black mt-2'
            >
              <p>{file.name}</p>
              <p>{formatDuration(file.duration)}</p>
              <p>${file.amount.toFixed(2)}</p>
            </div>
          ))}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel onClick={onClose}>Close</AlertDialogCancel>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
)

export default BillBreakdownDialog
