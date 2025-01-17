export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { authenticateRequest } from '@/services/auth-service/authenticate-api'

export async function GET(req: NextRequest) {
  try {
    const user = await authenticateRequest(req)
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }
    const userId = user.userId

    const searchParams = req.nextUrl.searchParams
    const fileId = searchParams.get('fileId')

    if (!fileId) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      )
    }

    const file = await prisma.file.findUnique({
      where: {
        fileId,
      },
      select: {
        filename: true,
        id: true,
        duration: true,
        fileId: true,
        converted: true,
        Orders: true,
        InvoiceFile: true,
      },
    })

    if (!file) {
      return NextResponse.json({ success: false, message: 'File not found' })
    }

    const invoiceDetails = await prisma.invoice.findFirst({
      where: {
        invoiceId: file?.InvoiceFile[0]?.invoiceId ?? '',
      },
    })

    const templates = await prisma.template.findMany({
      where: {
        OR: [{ userId: userId }, { userId: null }],
      },
    })

    const info = {
      filename: file.filename,
      file_id: file.fileId,
      file_no: file.fileId,
      part_num: null,
      total_duration: file.duration,
      utf_id: null,
      num_parts: null,
      pr_id: null,
      terms: null,
      shortcuts: null,
      options:
        invoiceDetails && invoiceDetails.options
          ? JSON.parse(invoiceDetails.options)
          : null,
      instructions:
        invoiceDetails && invoiceDetails.instructions
          ? invoiceDetails.instructions
          : '',
      templates: templates?.map((template) => ({
        code: template.id,
        name: template.name,
      })),
      tr_part_durations: [],
      pr_part_duration: [],
      pwer: file.Orders[0]?.pwer,
      video_available: false,
      video_location: null,
      legal_file: false,
    }

    logger.info(`File details fetched successfully for file ${fileId}`)

    return NextResponse.json({
      success: true,
      data: info,
    })
  } catch (error) {
    logger.error(`Failed to get file information for editor, ${error}`)
    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred. Please try again after some time.',
      },
      { status: 500 }
    )
  }
}
