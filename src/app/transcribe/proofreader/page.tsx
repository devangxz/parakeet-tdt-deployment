/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'

import { determinePwerLevel } from '../components/utils'
import { getHistoryPRFiles } from '@/app/actions/qc/history/pr'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getFormattedTimeStrings } from '@/utils/getFormattedTimeStrings'

function HistoryFile({ history }: { history: any }) {
  const { pwer } = history.order
  const { duration, filename } = history.order.File
  const { timeString, dateString } = getFormattedTimeStrings(
    history.order.orderTs.toISOString()
  )

  const diff = determinePwerLevel(pwer)

  return (
    <TableRow>
      <TableCell className='px-4 py-3'>
        <div className='mb-2 font-medium'>{filename}</div>
        <Badge
          variant='outline'
          className='font-semibold text-[10px] text-green-600'
        >
          {diff}
        </Badge>
      </TableCell>
      <TableCell className='px-4 py-3'>
        <p>${(duration * 0.8).toFixed(2)}</p>
        <p>{duration}</p>
      </TableCell>
      <TableCell className='px-4 py-3'>
        <p>{timeString},</p>
        <p>{dateString}</p>
      </TableCell>
      <TableCell className='px-4 py-3'>
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
  const allowedRoles = ['PROOFREADER_LEGACY', 'QC', 'REVIEWER']

  if (
    session?.user &&
    status === 'authenticated' &&
    !allowedRoles.includes(session?.user?.role)
  ) {
    router.replace('/transcribe/transcriber')
  }

  const fetchHistoryFiles = async () => {
    const response: any = await getHistoryPRFiles()
    if (response.success) {
      setHistoryFiles(response.data)
    }
  }

  useEffect(() => {
    fetchHistoryFiles()
  }, [])

  return (
    <div className='h-full flex-1 flex-col p-4 md:flex space-y-3'>
      <div>
        <h1 className='text-lg font-semibold md:text-xl'>
          Proofread History ({historyFiles?.length})
        </h1>
      </div>

      <div className='rounded-md border-2 border-customBorder bg-background'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className='h-fit p-4 text-left align-middle font-medium text-[15px]'>
                Details
              </TableHead>
              <TableHead className='h-fit p-4 text-left align-middle font-medium text-[15px]'>
                Price/Duration
              </TableHead>
              <TableHead className='h-fit p-4 text-left align-middle font-medium text-[15px]'>
                Submitted on
              </TableHead>
              <TableHead className='h-fit p-4 text-left align-middle font-medium text-[15px]'>
                Rating
              </TableHead>
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
                  No results
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
