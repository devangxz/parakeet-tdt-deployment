'use client'

import { CalendarIcon } from '@radix-ui/react-icons'
import { format } from 'date-fns'
import { ChevronDown, ChevronUp, InfoIcon } from 'lucide-react'
import * as React from 'react'

import JsonEditor from '@/components/json-editor'
import SupportingDocumentsDialog from '@/components/supporting-documents-dialog'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipProvider,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface Template {
  id: number
  name: string
}

interface CustomOrderOptionsProps {
  fileId: string
  filename: string
  risData: string
  folderName: string
  templateId: string
  dueDate: Date | string | undefined
  onTemplateChange: (fileId: string, newValue: string) => void
  onDueDateChange: (fileId: string, newDate: Date | string) => void
  onViewRISData: (fileId: string, risData: string) => void
  isInitiallyOpen: boolean
  templates: Template[]
  organizationName: string
  orderType: string
}

export function CustomOrderOptions({
  fileId,
  filename,
  risData,
  templateId,
  dueDate,
  onTemplateChange,
  onDueDateChange,
  onViewRISData,
  isInitiallyOpen,
  templates,
  organizationName,
  orderType,
}: CustomOrderOptionsProps) {
  const [isOpen, setIsOpen] = React.useState(isInitiallyOpen)

  const templateName =
    templates.find((template) => template.id == Number(templateId))?.name ??
    'not-selected'

  const dueDateObject = dueDate
    ? typeof dueDate === 'string'
      ? new Date(dueDate)
      : dueDate
    : undefined

  const handleTranscriptTemplateChange = (newValue: string) => {
    onTemplateChange(fileId, newValue)
  }

  const handleDateSelection = (date: Date | undefined) => {
    if (date) {
      onDueDateChange(fileId, date)
    }
  }

  const handleRISDataChange = (json: object) => {
    onViewRISData(fileId, JSON.stringify(json))
  }

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className='mb-6 mr-5 mt-4'
    >
      <div className='flex justify-between flex-wrap'>
        <div className='flex items-center gap-2'>
          <div className='text-md font-medium ml-3'>{filename}</div>
        </div>
        <div className='text-md font-normal'>
          <CollapsibleTrigger>
            {isOpen ? (
              <ChevronUp className='h-4 w-4 cursor-pointer' />
            ) : (
              <ChevronDown className='h-4 w-4 cursor-pointer' />
            )}
          </CollapsibleTrigger>
        </div>
      </div>
      <CollapsibleContent className='mt-5 ml-5'>
        <div className='flex items-center justify-between gap-5'>
          {orderType !== 'FORMATTING' ? (
            <div className='w-[229px]'>
              <div className='flex items-center gap-1'>
                <Label>Select template</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <InfoIcon className='h-4 w-4 text-muted-foreground' />
                    </TooltipTrigger>
                    <TooltipContent>
                      For other templates, please contact support.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Select
                defaultValue={templateId}
                onValueChange={handleTranscriptTemplateChange}
              >
                <SelectTrigger className='w-[220px]'>
                  <SelectValue placeholder='Template' />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem
                      key={template.id}
                      value={template.id.toString()}
                    >
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className='w-[229px]'>
              <div className='flex items-center gap-1'>
                <Label>Supporting Documents</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <InfoIcon className='h-4 w-4 text-muted-foreground' />
                    </TooltipTrigger>
                    <TooltipContent>
                      Upload up to 5 supporting documents (PDF, DOCX, TXT) to
                      help with formatting.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <SupportingDocumentsDialog fileId={fileId} />
            </div>
          )}
          <div className='w-[229px] flex flex-col'>
            <Label className='pb-1'>Due date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={'outline'}
                  className={cn(
                    'w-[240px] pl-3 text-left font-normal not-rounded',
                    !dueDateObject && 'text-muted-foreground'
                  )}
                >
                  {dueDateObject ? (
                    format(dueDateObject, 'PPP')
                  ) : (
                    <span>Pick a date</span>
                  )}
                  <CalendarIcon className='ml-auto h-4 w-4 opacity-50' />
                </Button>
              </PopoverTrigger>
              <PopoverContent className='w-auto p-0' align='start'>
                <Calendar
                  mode='single'
                  selected={dueDateObject}
                  onSelect={handleDateSelection}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {organizationName.toLowerCase() === 'remotelegal' &&
          templateName?.toLowerCase() === 'deposition' && (
            <div className='flex items-center justify-between gap-5 mt-5'>
              <div className='w-[229px]'>
                <Label>RIS data</Label>
                <div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className='not-rounded w-full' variant='outline'>
                        View
                      </Button>
                    </DialogTrigger>
                    <DialogContent className='sm:max-w-[60%]'>
                      <DialogHeader>
                        <DialogTitle>RIS Data</DialogTitle>
                        <DialogDescription>
                          Verify and edit the RIS data for this file.
                        </DialogDescription>
                      </DialogHeader>
                      <JsonEditor
                        json={risData ? JSON.parse(risData) : { name: 'value' }}
                        onChangeJSON={handleRISDataChange}
                      />
                      <DialogFooter>
                        <DialogClose asChild>
                          <Button
                            type='submit'
                            variant='outline'
                            className='not-rounded'
                          >
                            Save changes
                          </Button>
                        </DialogClose>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </div>
          )}
      </CollapsibleContent>
      <Separator className='mt-3' />
    </Collapsible>
  )
}
