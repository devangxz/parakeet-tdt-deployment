export const dynamic = 'force-dynamic'
import { FileTag } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const auth = authHeader?.split(' ')
    const auth_key = auth && auth[0] === 'Basic' && auth[1] ? auth[1] : null

    if (!auth_key || auth_key !== process.env.SCRIBIE_API_KEY) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized',
      })
    }

    const searchParams = req.nextUrl.searchParams
    const fileId = searchParams.get('fileId')
    const type = searchParams.get('type')

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
        userId: true,
        customFormattingDetails: true,
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
        userId: null,
      },
    })

    let versionId = ''

    const qcEditFile = await prisma.fileVersion.findFirst({
      where: {
        fileId: file.fileId,
        tag: FileTag.QC_EDIT,
      },
    })
    if (!qcEditFile) {
      const autoEditFile = await prisma.fileVersion.findFirst({
        where: {
          fileId: file.fileId,
          tag: FileTag.AUTO,
        },
      })
      versionId = autoEditFile?.s3VersionId ?? ''
    } else {
      versionId = qcEditFile?.s3VersionId ?? ''
    }

    if (type === 'custom-formatting') {
      const qcDeliveredFile = await prisma.fileVersion.findFirst({
        where: {
          fileId: file.fileId,
          tag: FileTag.QC_DELIVERED,
        },
      })
      if (qcDeliveredFile) {
        versionId = qcDeliveredFile?.s3VersionId ?? ''
      }
    }
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
      customFormattingDetails: file.customFormattingDetails,
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
      legal_file: type === 'custom-formatting' ? true : false,
      versionId: versionId,
      editor_type: type === 'custom-formatting' ? 'legal' : 'general',
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
