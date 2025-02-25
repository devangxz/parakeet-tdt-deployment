import { ReloadIcon } from '@radix-ui/react-icons'
import { useState, useEffect } from 'react'
import ReactQuill from 'react-quill'
import { toast } from 'sonner'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog'
import { getFormattingOptionsAction } from '@/app/actions/editor/get-formatting-options'
import { setFormattingOptionsAction } from '@/app/actions/editor/set-formatting-options'
import { getFileTxtSignedUrl } from '@/app/actions/order/file-txt-signed-url'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface FormattingOptionsDialogProps {
  isFormattingOptionsModalOpen: boolean
  setIsFormattingOptionsModalOpen: React.Dispatch<React.SetStateAction<boolean>>
  orderId: number
  fileId: string
  quillRef: React.RefObject<ReactQuill> | undefined
  updateQuill: (
    quillRef: React.RefObject<ReactQuill> | undefined,
    content: string
  ) => void
}

const FormattingOptionsDialog = ({
  isFormattingOptionsModalOpen,
  setIsFormattingOptionsModalOpen,
  orderId,
  fileId,
  quillRef,
  updateQuill,
}: FormattingOptionsDialogProps) => {
  const [formattingOptions, setFormattingOptions] = useState({
    timeCoding: true,
    speakerTracking: true,
    nameFormat: 'initials',
  })
  const [initialFormattingOptions, setInitialFormattingOptions] = useState({
    timeCoding: true,
    speakerTracking: true,
    nameFormat: 'initials',
  })
  const [currentTemplate, setCurrentTemplate] = useState('1')
  const [initialTemplate, setInitialTemplate] = useState('1')
  const [allPublicTemplates, setAllPublicTemplates] = useState<
    { name: string; id: string }[]
  >([])
  const [existingOptions, setExistingOptions] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isApplying, setIsApplying] = useState(false)

  useEffect(() => {
    if (orderId) {
      getFormattingOptions()
    }
  }, [orderId])

  const hasChanges = () => formattingOptions.timeCoding !== initialFormattingOptions.timeCoding ||
      formattingOptions.speakerTracking !== initialFormattingOptions.speakerTracking ||
      formattingOptions.nameFormat !== initialFormattingOptions.nameFormat ||
      currentTemplate !== initialTemplate

  const getFormattingOptions = async () => {
    setIsLoading(true)
    try {
      const response = await getFormattingOptionsAction(orderId)
      const { options, templates, currentTemplate } = response
      const newFormattingOptions = {
        timeCoding: options.ts === 1,
        speakerTracking: options.sif === 1,
        nameFormat: options.si === 0 ? 'initials' : 'full-names',
      }
      setFormattingOptions(newFormattingOptions)
      setInitialFormattingOptions(newFormattingOptions)
      if (templates) {
        setAllPublicTemplates(
          templates?.map((temp: { name: string; id: number }) => ({
            ...temp,
            id: temp.id.toString(),
          }))
        )
      }
      if (currentTemplate) {
        setCurrentTemplate(currentTemplate?.id.toString())
        setInitialTemplate(currentTemplate?.id.toString())
      }
      setExistingOptions(JSON.stringify(options))
    } catch (error) {
      toast.error('Failed to fetch formatting options')
    } finally {
      setIsLoading(false)
    }
  }

  const handleFormattingOptionChange = async () => {
    setIsApplying(true)
    try {
      await setFormattingOptionsAction(
        orderId,
        formattingOptions,
        JSON.parse(existingOptions),
        +currentTemplate
      )

      setInitialFormattingOptions({...formattingOptions})
      setInitialTemplate(currentTemplate)

      const response = await getFileTxtSignedUrl(fileId)
      if (!response.signedUrl) {
        throw new Error('Failed to get formatted transcript')
      }
      const formattedTranscript = await fetch(response.signedUrl).then((res) =>
        res.text()
      )

      updateQuill(quillRef, formattedTranscript)
      toast.success('Formatting options updated successfully')
      setIsFormattingOptionsModalOpen(false)
    } catch (error) {
      toast.error('Failed to update formatting options')
    } finally {
      setIsApplying(false)
    }
  }

  return (
    <Dialog
      open={isFormattingOptionsModalOpen}
      onOpenChange={setIsFormattingOptionsModalOpen}
    >
      <DialogContent className='p-0 gap-0'>
        <DialogHeader className='p-4'>
          <DialogTitle>Formatting Options</DialogTitle>
          <DialogDescription className='text-red-500'>
            These options discard all changes made and reverts the transcript to
            the delivered version. Please set these options before making any
            edits.
          </DialogDescription>
        </DialogHeader>

        <div className='m-4 mt-1 rounded-md border'>
          {isLoading ? (
            <div className='flex justify-center items-center py-4'>
              <ReloadIcon className='h-4 w-4 animate-spin' />
              <span className='ml-2 text-sm text-muted-foreground'>
                Loading formatting options...
              </span>
            </div>
          ) : (
            <div className='p-4 space-y-4'>
              <div className='flex items-center space-x-2'>
                <Checkbox
                  id='time-coding'
                  checked={formattingOptions.timeCoding}
                  onCheckedChange={(checked) =>
                    setFormattingOptions((prev) => ({
                      ...prev,
                      timeCoding: checked as boolean,
                    }))
                  }
                  disabled={isApplying}
                />
                <Label htmlFor='time-coding'>Time-coding</Label>
              </div>
              <div className='flex items-center space-x-2'>
                <Checkbox
                  id='speaker-tracking'
                  checked={formattingOptions.speakerTracking}
                  onCheckedChange={(checked) =>
                    setFormattingOptions((prev) => ({
                      ...prev,
                      speakerTracking: checked as boolean
                    }))
                  }
                  disabled={isApplying}
                />
                <Label htmlFor='speaker-tracking'>Speaker Tracking</Label>
              </div>
              <div className={`overflow-hidden transition-all duration-200 ease-in-out ${formattingOptions.speakerTracking ? 'max-h-24 opacity-100' : 'max-h-0 opacity-0'}`}>
                <RadioGroup
                  value={formattingOptions.nameFormat}
                  onValueChange={(value) =>
                    setFormattingOptions((prev) => ({
                      ...prev,
                      nameFormat: value,
                    }))
                  }
                  className='pl-6 space-y-2'
                  disabled={isApplying}
                >
                  <div className='flex items-center space-x-2'>
                    <RadioGroupItem value='initials' id='initials' disabled={isApplying} />
                    <Label className={isApplying ? 'opacity-70' : ''} htmlFor='initials'>Initials</Label>
                  </div>
                  <div className='flex items-center space-x-2'>
                    <RadioGroupItem value='full-names' id='full-names' disabled={isApplying} />
                    <Label className={isApplying ? 'opacity-70' : ''} htmlFor='full-names'>Full Names</Label>
                  </div>
                </RadioGroup>
              </div>
              <div className='space-y-2'>
                <Label htmlFor='template'>Template</Label>
                <Select
                  value={currentTemplate}
                  onValueChange={(value) => setCurrentTemplate(value)}
                  disabled={isApplying}
                >
                  <SelectTrigger>
                    <SelectValue placeholder='Select a template' />
                  </SelectTrigger>
                  <SelectContent>
                    {allPublicTemplates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        <div className='flex justify-end items-center gap-x-2 m-4 mt-1'>
          <Button
            onClick={() => setIsFormattingOptionsModalOpen(false)}
            variant='outline'
            disabled={isApplying || isLoading}
          >
            Close
          </Button>
          <Button
            onClick={handleFormattingOptionChange}
            disabled={isApplying || isLoading || !hasChanges()}
            className='flex items-center gap-2'
          >
            {isApplying && <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />}
            Apply
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default FormattingOptionsDialog
