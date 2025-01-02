/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'
import { ReloadIcon } from '@radix-ui/react-icons'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import AudioPlayer from './components/AudioPlayer'
import { fetchFileOrderInformation } from '@/app/actions/om/fetch-file-order-information'
import AssignFinalizerDialog from '@/components/admin-components/assign-finalizer'
import AssignQcDialog from '@/components/admin-components/assign-qc-dialog'
import ReassignFinalizer from '@/components/admin-components/re-assign-finalizer-dialog'
import ReassignReview from '@/components/admin-components/re-assign-review'
import ReportBadAudioDialog from '@/components/admin-components/report-bad-audio-dialog'
import SetFileAccentDialog from '@/components/admin-components/set-accent-dialog'
import SetFileDifficultyDialog from '@/components/admin-components/set-difficulty-dialog'
import SetFileBonusDialog from '@/components/admin-components/set-file-bonus-dialog'
import SetFileRateDialog from '@/components/admin-components/set-file-rate-dialog'
import SetInstructionsDialog from '@/components/admin-components/set-instructions-dialog'
import UnassignQcDialog from '@/components/admin-components/unassign-qc-dialog'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { FileCost } from '@/types/files'
import formatDateTime from '@/utils/formatDateTime'
import formatDuration from '@/utils/formatDuration'

interface File {
  filename: string
  user: number
  duration: string
  br: number | null
  sr: number
  sc: number
  hd: boolean
  pwer: number
  wer: number | null
  bonus: number
  ordered: string
  deadline: string
  deliveryTs: string
  status: string
  qc: string
  customFormattingFile: string
  priority: number
  fileId: string
  orderId: number
  instructions: string
  fileCost: FileCost
  rateBonus: number
  type: string
}

interface StatusPageProps {
  selectedFileId: string
}

export default function StatusPage({ selectedFileId }: StatusPageProps) {
  const [orderInformation, setOrderInformation] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [fileId, setFileId] = useState<string>(selectedFileId)
  const [orderId, setOrderId] = useState<string>('')
  const [openRateDialog, setRateDialog] = useState(false)
  const [openBonusDialog, setBonusDialog] = useState(false)
  const [openBadAudioDialog, setBadAudioDialog] = useState(false)
  const [openAccentDialog, setAccentDialog] = useState(false)
  const [openDifficultyDialog, setDifficultyDialog] = useState(false)
  const [openUnassignQcDialog, setUnassignQcDialog] = useState(false)
  const [openAssignQcDialog, setAssignQcDialog] = useState(false)
  const [openInstructionsDialog, setInstructionsDialog] = useState(false)
  const [openReassignReviewDialog, setReassignReviewDialog] = useState(false)
  const [openReassignFinalizerDialog, setReassignFinalizerDialog] =
    useState(false)
  const [openAssignFinalizerDialog, setAssignFinalizerDialog] = useState(false)

  const handleSearch = async () => {
    try {
      setIsLoading(true)
      const response = await fetchFileOrderInformation(fileId)

      if (response.success && response.details) {
        const orderDetails = response.details as any
        const qcNames = orderDetails.Assignment.filter(
          (a: { status: string }) =>
            a.status === 'ACCEPTED' || a.status === 'COMPLETED'
        )
          .map(
            (a: { user: { firstname: string; lastname: string } }) =>
              `${a.user.firstname} ${a.user.lastname}`
          )
          .join(', ')

        const order = {
          filename: orderDetails.File.filename,
          user: orderDetails.userId,
          duration: formatDuration(orderDetails.File.duration),
          br: orderDetails.File.bitRate,
          sr: orderDetails.File.sampleRate,
          sc: orderDetails.screenCount,
          hd: orderDetails.highDifficulty,
          pwer: orderDetails.pwer,
          wer: orderDetails.wer,
          bonus: orderDetails.qaBonus,
          ordered: formatDateTime(orderDetails.orderTs),
          deadline: formatDateTime(orderDetails.deadlineTs),
          deliveryTs: formatDateTime(orderDetails.deliveryTs),
          status: orderDetails.status,
          qc: qcNames || '-',
          customFormattingFile:
            orderDetails.orderType === 'TRANSCRIPTION' ? 'No' : 'Yes',
          priority: orderDetails.priority,
          fileId: orderDetails.fileId,
          orderId: orderDetails.id,
          instructions: orderDetails.instructions,
          fileCost: orderDetails.fileCost,
          rateBonus: orderDetails.rateBonus,
          type: orderDetails.orderType,
        }

        setOrderInformation(order)
      } else {
        toast.error(response.message)
      }
    } catch (error) {
      toast.error('Failed to get file status')
    } finally {
      setIsLoading(false)
    }
  }

  const fieldLabels: Record<string, string> = {
    filename: 'File Name',
    user: 'User',
    duration: 'Duration',
    br: 'BR',
    sr: 'SR',
    sc: 'SC',
    hd: 'HD',
    pwer: 'PWER',
    wer: 'WER',
    bonus: 'Bonus',
    ordered: 'Ordered',
    deadline: 'Deadline',
    deliveryTs: 'Delivery',
    status: 'Status',
    qc: 'Editor',
    customFormattingFile: 'Custom Formatting File',
    priority: 'Priority',
    fileId: 'File ID',
    orderId: 'Order ID',
    instructions: 'Instructions',
    fileCost: 'File Cost',
    rateBonus: 'Rate Bonus',
    type: 'Type',
  }

  useEffect(() => {
    if (selectedFileId.length > 0) {
      handleSearch()
    }
  }, [selectedFileId])

  const refetch = () => {
    console.log('Refetching')
  }

  return (
    <>
      <div className='h-full flex-1 flex-col space-y-8 p-8 md:flex'>
        <div className='flex items-center justify-between space-y-2'>
          <div>
            <h1 className='text-lg font-semibold md:text-lg'>
              Search File Information
            </h1>
          </div>
        </div>
        <div className='grid w-full items-center gap-1.5'>
          <Label htmlFor='email'>File Id</Label>
          <Input
            value={fileId}
            type='text'
            placeholder='File Id'
            onChange={(e) => setFileId(e.target.value)}
            className='bg-white'
          />
          {isLoading ? (
            <Button disabled className='mt-3 w-[200px]'>
              Please wait
              <ReloadIcon className='ml-2 h-4 w-4 animate-spin' />
            </Button>
          ) : (
            <Button className='w-[200px] mt-3' onClick={handleSearch}>
              Lookup
            </Button>
          )}
        </div>
        <Separator />
        {orderInformation && (
          <Card>
            <CardHeader>
              <CardTitle>ORDER DETAILS</CardTitle>
            </CardHeader>

            <CardContent>
              <AudioPlayer fileId={fileId} />
              <div className='grid'>
                {orderInformation &&
                  Object.entries(orderInformation).map(
                    ([key, value], index) => {
                      if (key === 'fileCost') {
                        return (
                          <div
                            key={key}
                            className={`grid grid-cols-2 p-2 mt-2 ${index % 2 === 0 ? 'bg-gray-100' : 'bg-white'
                              }`}
                          >
                            <span className='font-semibold'>
                              {fieldLabels[key]}
                            </span>
                            <span>
                              <p>
                                Transcription cost: <br /> $
                                {value.transcriptionCost}/ah ($
                                {value.transcriptionRate}/ah + $
                                {orderInformation.rateBonus}/ah)
                              </p>
                              {orderInformation.type ===
                                'TRANSCRIPTION_FORMATTING' && (
                                  <p className='mt-1'>
                                    Review cost: <br /> $
                                    {orderInformation.fileCost.customFormatCost}
                                    /ah ($
                                    {orderInformation.fileCost.customFormatRate}
                                    /ah + ${orderInformation.rateBonus}/ah)
                                  </p>
                                )}
                            </span>
                          </div>
                        )
                      }
                      return (
                        <div
                          key={key}
                          className={`grid grid-cols-2 p-2 mt-2 ${index % 2 === 0 ? 'bg-gray-100' : 'bg-white'
                            }`}
                        >
                          <span className='font-semibold'>
                            {fieldLabels[key]}
                          </span>
                          <span>{value?.toString()}</span>
                        </div>
                      )
                    }
                  )}
              </div>
            </CardContent>
            <CardFooter className='flex gap-4 flex-wrap'>
              <Button
                className='not-rounded'
                variant='outline'
                size='sm'
                onClick={() => setRateDialog(true)}
              >
                Set file rate
              </Button>
              <Button
                className='not-rounded'
                onClick={() => setBonusDialog(true)}
                variant='outline'
                size='sm'
              >
                Set file bonus
              </Button>
              <Button
                className='not-rounded'
                onClick={() => setInstructionsDialog(true)}
                variant='outline'
                size='sm'
              >
                Set Instructions
              </Button>
              <Button
                className='not-rounded'
                onClick={() => setBadAudioDialog(true)}
                variant='outline'
                size='sm'
              >
                Bad audio
              </Button>
              <Button
                className='not-rounded'
                onClick={() => setAccentDialog(true)}
                variant='outline'
                size='sm'
              >
                Set Accent
              </Button>{' '}
              <Button
                className='not-rounded'
                onClick={() =>
                  window.open(
                    `/editor/${orderInformation?.fileId}`,
                    '_blank',
                    'noopener,noreferrer'
                  )
                }
                variant='outline'
                size='sm'
              >
                Deliver
              </Button>
              <Button
                className='not-rounded'
                onClick={() => setUnassignQcDialog(true)}
                variant='outline'
                size='sm'
              >
                Unassign Editor
              </Button>
              <Button
                className='not-rounded'
                onClick={() => setAssignQcDialog(true)}
                variant='outline'
                size='sm'
              >
                Assign Editor
              </Button>
              <Button
                className='not-rounded'
                onClick={() => {
                  setOrderId(orderInformation?.orderId.toString())
                  setReassignReviewDialog(true)
                }}
                variant='outline'
                size='sm'
              >
                Re-assign Review
              </Button>
              <Button
                className='not-rounded'
                onClick={() => {
                  setOrderId(orderInformation?.orderId.toString())
                  setReassignFinalizerDialog(true)
                }}
                variant='outline'
                size='sm'
              >
                Re-assign Finalizer
              </Button>
              <Button
                className='not-rounded'
                onClick={() => setAssignFinalizerDialog(true)}
                variant='outline'
                size='sm'
              >
                Assign Finalizer
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
      <SetFileRateDialog
        open={openRateDialog}
        onClose={() => setRateDialog(false)}
        fileId={orderInformation?.fileId || ''}
      />
      <SetFileBonusDialog
        open={openBonusDialog}
        onClose={() => setBonusDialog(false)}
        fileId={orderInformation?.fileId || ''}
      />
      <ReportBadAudioDialog
        open={openBadAudioDialog}
        onClose={() => setBadAudioDialog(false)}
        fileId={orderInformation?.fileId || ''}
      />
      <SetFileAccentDialog
        open={openAccentDialog}
        onClose={() => setAccentDialog(false)}
        fileId={orderInformation?.fileId || ''}
      />
      <SetFileDifficultyDialog
        open={openDifficultyDialog}
        onClose={() => setDifficultyDialog(false)}
        fileId={orderInformation?.fileId || ''}
      />
      <UnassignQcDialog
        open={openUnassignQcDialog}
        onClose={() => setUnassignQcDialog(false)}
        fileId={orderInformation?.fileId || ''}
      />
      <AssignQcDialog
        open={openAssignQcDialog}
        onClose={() => setAssignQcDialog(false)}
        fileId={orderInformation?.fileId || ''}
      />
      <SetInstructionsDialog
        open={openInstructionsDialog}
        onClose={() => setInstructionsDialog(false)}
        fileId={orderInformation?.fileId || ''}
        orderInstructions={orderInformation?.instructions || ''}
      />
      <ReassignFinalizer
        open={openReassignFinalizerDialog}
        onClose={() => setReassignFinalizerDialog(false)}
        orderId={orderId || ''}
        refetch={() => refetch()}
        isCompleted={true}
      />
      <ReassignReview
        open={openReassignReviewDialog}
        onClose={() => setReassignReviewDialog(false)}
        orderId={orderId || ''}
        refetch={() => refetch()}
        isCompleted={true}
      />
      <AssignFinalizerDialog
        open={openAssignFinalizerDialog}
        onClose={() => setAssignFinalizerDialog(false)}
        fileId={orderInformation?.fileId || ''}
      />
    </>
  )
}
