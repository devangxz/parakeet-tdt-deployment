'use server'

import { FileTag, OrderType } from '@prisma/client'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import { FILE_CACHE_URL } from '@/constants'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { getFileVersionSignedURLFromS3 } from '@/utils/backend-helper'

const getSignedUrl = async (version: FileTag, fileId: string, filename: string | undefined) => {
    const fileVersion = await prisma.fileVersion.findFirst({
        where: {
            fileId: fileId,
            tag: version,
        },
        select: {
            s3VersionId: true,
        },
    })
    if (!fileVersion || !fileVersion.s3VersionId) {
        return '';
    }
    const signedUrl = await getFileVersionSignedURLFromS3(
        `${fileId}.docx`,
        fileVersion?.s3VersionId,
        900,
        `${filename}.docx`
    )
    return signedUrl
}

// selected types -> [microsoft-word', 'pdf', 'plain-text', 'vtt', 'srt']
export async function getZipFilesAction(ids: (string | number)[], selectedTypes: string[]) {
    try {
        const session = await getServerSession(authOptions)
        const fileIds = ids.filter((id): id is string => typeof id === 'string')
        const folderIds = ids.filter((id): id is number => typeof id === 'number')

        const files: { url: string, name: string }[] = []

        const getChildrenFiles = async () => {
            const getFilesInFolder = async (folderId: number): Promise<string[]> => {
                // Get direct files in this folder
                const files = await prisma.file.findMany({
                    where: {
                        parentId: folderId
                    },
                    select: {
                        fileId: true
                    }
                })

                // Get subfolders in this folder
                const subfolders = await prisma.folder.findMany({
                    where: {
                        parentId: folderId
                    },
                    select: {
                        id: true
                    }
                })

                // Recursively get files from subfolders
                const subfolderFiles = await Promise.all(
                    subfolders.map(folder => getFilesInFolder(folder.id))
                )

                // Combine all file IDs
                return [
                    ...files.map(f => f.fileId),
                    ...subfolderFiles.flat()
                ]
            }

            // Get files from all selected folders
            const folderFiles = await Promise.all(
                folderIds.map(folderId => getFilesInFolder(folderId))
            )

            // Add found files to fileIds array
            fileIds.push(...folderFiles.flat())
        }

        await getChildrenFiles()

        const orders = await prisma.order.findMany({
            where: {
                fileId: {
                    in: fileIds
                }
            },
            include: {
                File: true
            }
        })

        if (!orders || orders.length === 0) {
            return {
                success: false,
                message: 'orders not found'
            }
        }

        for (const order of orders) {
            try {
                if (order.status === 'DELIVERED') {
                    const path = order.File?.fullPath ? `${order.File?.fullPath}/${order.File?.filename}` : order.File?.filename
                    if (selectedTypes.includes('microsoft-word')) {
                        if (order.orderType === OrderType.TRANSCRIPTION) {
                            files.push({
                                url: `${FILE_CACHE_URL}/get-tr-docx/${order.fileId}?authToken=${session?.user?.token}`,
                                name: `${path}.docx`
                            })
                        } else if (order.orderType === OrderType.TRANSCRIPTION_FORMATTING) {
                            const signedUrl = await getSignedUrl(FileTag.CF_CUSTOMER_DELIVERED, order.fileId, order.File?.filename)
                            if (!signedUrl) continue;
                            files.push({
                                url: signedUrl,
                                name: `${path}.docx`
                            })
                        }
                    }
                    if (selectedTypes.includes('pdf')) {
                        if (order.orderType === OrderType.TRANSCRIPTION) {
                            files.push({
                                url: `${FILE_CACHE_URL}/get-tr-pdf/${order.fileId}?authToken=${session?.user?.token}`,
                                name: `${path}.pdf`
                            })
                        } else if (order.orderType === OrderType.TRANSCRIPTION_FORMATTING) {
                            files.push({
                                url: `${FILE_CACHE_URL}/get-cf-pdf/${order.fileId}?authToken=${session?.user?.token}`,
                                name: `${path}.pdf`
                            })
                        }
                    }
                    if (selectedTypes.includes('srt')) {
                        if (order.orderType === OrderType.TRANSCRIPTION) {
                            files.push({
                                url: `${FILE_CACHE_URL}/get-subtitles/${order.fileId}?authToken=${session?.user?.token}&ext=srt`,
                                name: `${path}.srt`
                            })
                        }
                    }
                    if (selectedTypes.includes('vtt')) {
                        if (order.orderType === OrderType.TRANSCRIPTION) {
                            files.push({
                                url: `${FILE_CACHE_URL}/get-subtitles/${order.fileId}?authToken=${session?.user?.token}&ext=vtt`,
                                name: `${path}.vtt`
                            })
                        }
                    }
                    if (selectedTypes.includes('plain-text')) {
                        if (order.orderType === OrderType.TRANSCRIPTION) {
                            const signedUrl = await getSignedUrl(FileTag.CUSTOMER_DELIVERED, order.fileId, order.File?.filename)
                            if (!signedUrl) continue;
                            files.push({
                                url: signedUrl,
                                name: `${path}.txt`
                            })
                        }
                    }
                }
            } catch (error) {
                continue;
            }
        }

        return {
            success: true,
            data: files
        }
    } catch (error) {
        logger.error(`Failed to send txt file ${error}`)
        return {
            success: false,
            message: 'An error occurred. Please try again after some time.'
        }
    }
}
