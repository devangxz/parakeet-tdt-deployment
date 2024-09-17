/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface DraftTranscriptFileDialogProps {
  open: boolean
  onClose: () => void
  fileId: string
  filename: string
}

const DraftTranscriptFileDialog = ({
  open,
  onClose,
  fileId,
  filename,
}: DraftTranscriptFileDialogProps) => (
  <AlertDialog open={open}>
    <AlertDialogContent className='sm:max-w-[50%]'>
      <AlertDialogHeader>
        <AlertDialogTitle>Draft Transcript of {filename}</AlertDialogTitle>
        <AlertDialogDescription>
          NOTICE <br /> Work-In-Progress Draft <br /> This transcript is not yet
          complete. There may be higher number of mistakes and missing sections
          in this transcript. The draft transcript is provided for the purpose
          of tracking and should not be considered as final. The final
          transcript documents will be provided for download after the
          transcript is delivered and the progress is 100%. <br />
          -----
          <br />
          Under processing. Please try again after some time.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel onClick={onClose}>Close</AlertDialogCancel>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
)

export default DraftTranscriptFileDialog
