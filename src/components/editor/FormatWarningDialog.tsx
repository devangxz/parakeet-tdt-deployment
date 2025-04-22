import React from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { CombinedASRFormatError } from '@/types/editor'

interface FormatWarningDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  errors: CombinedASRFormatError[]
}

const FormatWarningDialog: React.FC<FormatWarningDialogProps> = ({
  isOpen,
  onOpenChange,
  errors,
}) => (
  <Dialog open={isOpen} onOpenChange={onOpenChange}>
    <DialogContent
      className='sm:max-w-lg md:max-w-xl lg:max-w-2xl'
      onInteractOutside={(e) => {
        e.preventDefault()
      }}
    >
      <DialogHeader>
        <DialogTitle>Formatting Issues Detected</DialogTitle>
        <DialogDescription>
          The transcript has formatting issues that need correction. Please
          review the details below.
        </DialogDescription>
      </DialogHeader>

      <div className='border-l-4 border-primary flex items-start p-4 my-1 bg-primary/10 border rounded-md shadow-sm'>
        <div className='flex-shrink-0'>
          <svg
            xmlns='http://www.w3.org/2000/svg'
            className='h-6 w-6 text-primary'
            viewBox='0 0 20 20'
            fill='currentColor'
          >
            <path
              fillRule='evenodd'
              d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-9-4a1 1 0 112 0v2a1 1 0 01-2 0V6zm1 4a1 1 0 00-.993.883L9 11v2a1 1 0 001.993.117L11 13v-2a1 1 0 00-1-1z'
              clipRule='evenodd'
            />
          </svg>
        </div>
        <p className='text-sm text-primary dark:text-white ml-3'>
          You can manually correct these issues in the editor. Alternatively,
          you can use the &quot;Restore Version&quot; option available in the
          dropdown where you&apos;ll find the AssemblyAI version.
        </p>
      </div>

      {errors && errors.length > 0 && (
        <div className='max-h-80 overflow-y-auto space-y-2 border border-destructive/30 bg-destructive/5 p-3 rounded-md'>
          {errors.map((error, index) => (
            <div
              key={index}
              className='text-sm p-2 border-l-4 border-destructive rounded bg-background shadow-sm'
            >
              <p className='font-medium text-destructive'>
                Invalid Paragraph (Paragraph Number {error.paragraphNumber})
              </p>
              <p className='text-foreground/90 mt-1'>{error.message}</p>
              <div className='mt-1'>
                <span className='text-muted-foreground text-xs font-medium'>
                  Paragraph Content:
                </span>
                <pre className='text-muted-foreground mt-0.5 text-xs overflow-x-auto whitespace-pre-wrap break-words bg-muted p-1 rounded'>
                  <code>{error.paragraphContent}</code>
                </pre>
              </div>
            </div>
          ))}
        </div>
      )}
      <DialogFooter className='mt-4'>
        <Button variant='outline' onClick={() => onOpenChange(false)}>
          Close
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
)

export default FormatWarningDialog
