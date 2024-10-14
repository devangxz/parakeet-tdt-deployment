import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function POST(request: Request) {
  const { files } = await request.json()
  try {
    for (const file of files) {
      await prisma.file.update({
        where: { fileId: file.fileId },
        data: {
          customFormattingDetails: JSON.parse(file.risData),
          customInstructions: JSON.stringify({
            instructions: file.instructions,
            dueDate: file.dueDate,
            templateId: file.templateId,
          }),
        },
      })
    }
    logger.info('Updated files info')
    return NextResponse.json({
      success: true,
      message: 'Files updated successfully.',
    })
  } catch (error) {
    logger.error('Failed to update files info', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to update file info.',
    })
  }
}
