import { ReloadIcon } from '@radix-ui/react-icons'
import { diffWords } from 'diff'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'

import { getDiffFilesAction } from '@/app/actions/files/get-diff-files'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'

interface DialogProps {
  open: boolean
  onClose: () => void
  fileId: string
}

const OpenDiffDialog = ({ open, onClose, fileId }: DialogProps) => {
  const [diff, setDiff] = useState('')
  const [loading, setLoading] = useState(false)

  const diffParagraphs = (asrText: string, qcText: string) => {
    // Split the texts into paragraphs
    const asrParagraphs = asrText.split('\n\n')
    const qcParagraphs = qcText.split('\n\n')

    // Find the maximum number of paragraphs
    const maxLength = Math.max(asrParagraphs.length, qcParagraphs.length)

    let diffResult = ''

    for (let i = 0; i < maxLength; i++) {
      const asrParagraph = asrParagraphs[i] || ''
      const qcParagraph = qcParagraphs[i] || ''

      const diffArray = diffWords(asrParagraph, qcParagraph)

      // Reconstruct the paragraph with diff markers
      diffArray.forEach((part) => {
        // Green for added, red for removed, grey for unchanged
        const color = part.added ? 'added' : part.removed ? 'removed' : ''

        diffResult += `<span class="${color}">${part.value}</span>`
      })

      // Add paragraph break
      diffResult += '<br><br>'
    }

    return diffResult
  }

  const loadDiff = async () => {
    setLoading(true)
    try {
      const res = await getDiffFilesAction(fileId)
      console.log(res)
      const { asrFile, qcFile } = res
      if (!asrFile || !qcFile) {
        throw new Error('Failed to load diff')
      }
      const diff = diffParagraphs(asrFile, qcFile)
      setDiff(diff)
      setLoading(false)
    } catch (error) {
      toast.error('Failed to load diff')
      onClose()
    }
  }

  useEffect(() => {
    if (fileId.length > 0) {
      loadDiff()
    }
  }, [fileId])

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className='sm:max-w-[792px] sm:max-h-[500px] overflow-y-auto'>
        <AlertDialogHeader>
          <AlertDialogTitle>Diff Between ASR and Editor</AlertDialogTitle>
          <AlertDialogDescription>
            {loading ? (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: '20vh',
                }}
              >
                <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
                <p>Loading...</p>
              </div>
            ) : (
              <div dangerouslySetInnerHTML={{ __html: diff }} />
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Close</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default OpenDiffDialog
