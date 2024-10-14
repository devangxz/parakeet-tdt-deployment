/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'
import axios from 'axios'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { HIGH_PWER, LOW_PWER } from '@/constants'
import { getFormattedTimeStrings } from '@/utils/getFormattedTimeStrings'

function HistoryFile({ history }: { history: any }) {
  const { pwer } = history.order
  const { duration, filename } = history.order.File
  const { timeString, dateString } = getFormattedTimeStrings(
    history.order.orderTs
  )

  const diff = pwer > HIGH_PWER ? 'HIGH' : pwer < LOW_PWER ? 'LOW' : 'MEDIUM'

  return (
    <TableRow>
      <TableCell className='w-[400px]'>
        <div className='flex'>
          <div className='ml-5'>
            <div className='mb-2'>{filename}</div>
            <div className='grid grid-flow-col gap-1'>
              <Badge
                variant='outline'
                className='font-semibold text-[10px] text-green-600'
              >
                {diff}
              </Badge>
            </div>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <p>${(duration * 0.8).toFixed(2)}</p>
        <p>{duration}</p>
      </TableCell>
      <TableCell>
        <p>{timeString},</p>
        <p>{dateString}</p>
      </TableCell>
      <TableCell>
        <p>Verified</p>
        <p>3-Star</p>
      </TableCell>
    </TableRow>
  )
}

export default function QCPage() {
  const [historyFiles, setHistoryFiles] = useState([])
  const { data: session, status } = useSession()
  const router = useRouter()

  if (
    session?.user &&
    status === 'authenticated' &&
    session?.user?.role !== 'CUSTOMER'
  ) {
    router.replace('/transcribe/transcriber')
  }

  const fetchHistoryFiles = async () => {
    const response = await axios.get(`/api/qc/history/tr`)
    setHistoryFiles(response.data)
  }

  useEffect(() => {
    fetchHistoryFiles()
  }, [])

  return (
    <div className='bg-[#F7F5FF] h-screen'>
      <div className='mt-8 ml-8 w-4/5'>
        <h1 className='text-lg font-semibold mb-5'>
          Transcription history ({historyFiles?.length})
        </h1>
        <Table className='bg-white rounded-xl border-gray-200'>
          <TableHeader>
            <TableRow>
              <TableHead>Details</TableHead>
              <TableHead>Price/Duration</TableHead>
              <TableHead>Submitted on</TableHead>
              <TableHead>Rating</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {historyFiles.length > 0 ? (
              historyFiles.map((file: any) => (
                <HistoryFile key={file.id} history={file} />
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className='h-24 text-center'>
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
