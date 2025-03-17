import { ReloadIcon } from '@radix-ui/react-icons'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'

import { getDiffFilesAction } from '@/app/actions/files/get-diff-files'
import { Button } from '@/components/ui/button'
import { Dialog, DialogFooter, DialogContent, DialogHeader, DialogDescription, DialogTitle, DialogClose } from '@/components/ui/dialog'
import { diff_match_patch, DIFF_INSERT, DIFF_DELETE, DmpDiff } from '@/utils/transcript/diff_match_patch'

interface DialogProps {
  open: boolean
  onClose: () => void
  fileId: string
}

const OpenDiffDialog = ({ open, onClose, fileId }: DialogProps) => {
  const [diff, setDiff] = useState<DmpDiff[]>([])
  const [loading, setLoading] = useState(false)

  const loadDiff = async () => {
    setLoading(true)
    try {
      const res = await getDiffFilesAction(fileId)
      const { asrFile, qcFile } = res
      if (!asrFile || !qcFile) {
        throw new Error('Failed to load diff')
      }
      const dmp = new diff_match_patch()
      const diff = dmp.diff_wordMode(asrFile, qcFile)
      dmp.diff_cleanupSemantic(diff)
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
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className='w-96 sm:w-full lg:max-w-4xl xl:max-w-6xl max-h-[90vh] flex flex-col'>
        <DialogHeader>
          <DialogTitle>Diff</ DialogTitle>
          <DialogDescription>diff between ASR and QC outputs</DialogDescription>
        </DialogHeader>
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '20vh',
                  }}
                  >
                  <ReloadIcon className='h-4 w-4 mr-2 animate-spin' />
                  <p>Loading...</p>
                </div>
              ) : (
                <div className='whitespace-pre-wrap'>
                  {diff.map((part, index) => {
                    const [op, text] = part
                    if (op === DIFF_INSERT) {
                      return <ins key={index} className="added">{text}</ins>
                    } else if (op === DIFF_DELETE) {
                      return <del key={index} className="removed">{text}</del>
                    }
                    return <span key={index}>{text}</span>
                  })}
                </div>
              )}
          </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant='outline' onClick={onClose}>Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default OpenDiffDialog
