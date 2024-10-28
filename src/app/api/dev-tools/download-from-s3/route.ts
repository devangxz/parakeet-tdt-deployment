export const dynamic = 'force-dynamic'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import { s3Client } from '@/lib/s3Client'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const fileId = searchParams.get('fileId')
    const suffix = searchParams.get('suffix')

    if (!fileId || !suffix) {
      return NextResponse.json(
        { error: 'Missing fileId or suffix' },
        { status: 400 }
      )
    }

    let key = ''
    if (['asr', 'qc', 'cf', 'cf_rev'].includes(suffix)) {
      key = `${fileId}_${suffix}.txt`
    } else if (suffix === 'cf_docx') {
      key = `${fileId}_cf.docx`
    } else if (suffix === 'ris') {
      key = `${fileId}_${suffix}.docx`
    } else if (suffix === 'ctms') {
      key = `${fileId}_${suffix}.json`
    } else if (suffix === 'mp3') {
      key = `${fileId}.mp3`
    }

    const command = new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: key,
    })

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 })
    logger.info(`Signed URL generated for file ${fileId} with suffix ${suffix}`)
    return NextResponse.json({ signedUrl })
  } catch (error) {
    logger.error('Error generating signed URL:', error)
    return NextResponse.json(
      { error: 'Failed to generate signed URL' },
      { status: 500 }
    )
  }
}
