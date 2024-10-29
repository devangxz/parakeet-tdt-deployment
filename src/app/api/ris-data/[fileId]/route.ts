export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import extractDataFromRISFile from '@/services/file-service/get-ris'

export async function GET(
    req: NextRequest,
    { params }: { params: { fileId: string } }
) {
    const fileId = params.fileId
    logger.info(`--> getRISData ${fileId}`)

    try {
        if (!fileId) {
            return NextResponse.json(
                { error: 'fileId is required as a parameter' },
                { status: 400 }
            )
        }

        const { searchParams } = new URL(req.url)
        const templateType = searchParams.get('template')
        if (!templateType) {
            return NextResponse.json(
                { error: 'template is required as a parameter' },
                { status: 400 }
            )
        }

        const userToken = req.headers.get('x-user-token')
        const user = JSON.parse(userToken ?? '{}')
        const organizationName = user?.organizationName?.toLowerCase()
        logger.info(`organizationName: ${organizationName}`)

        const risData = await extractDataFromRISFile(
            fileId,
            templateType,
            organizationName
        )

        await prisma.file.update({
            where: { fileId: fileId },
            data: { customFormattingDetails: risData }
        })

        logger.info(`<-- getRISData ${fileId}`)
        return NextResponse.json(risData, { status: 201 })
    } catch (err) {
        logger.error(`get RIS data failed ${(err as Error).toString()}`)
        return NextResponse.json({ error: 'get RIS data failed' }, { status: 400 })
    }
}
