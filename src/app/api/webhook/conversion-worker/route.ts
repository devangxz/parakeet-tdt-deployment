import { NextRequest, NextResponse } from 'next/server';

import { DURATION_DIFF, ERROR_CODES } from '@/constants';
import logger from '@/lib/logger';
import prisma from '@/lib/prisma';
import { getAWSSesInstance } from '@/lib/ses';
import refundFile from '@/services/file-service/refund-file';
import authenticateWebhook from '@/utils/authenticateWebhook';

interface ConversionResult {
    status: 'SUCCESS' | 'ERROR';
    userId: string;
    fileId: string;
    duration?: number;
    error?: string;
}

async function processConversionResult(result: ConversionResult) {
    const { status, userId, fileId, duration } = result;

    try {
        if (status === 'SUCCESS') {
            await prisma.file.update({
                where: { fileId },
                data: { converted: true }
            }).catch(error => {
                logger.error(`Failed to update conversion status in database: ${fileId}`, error);
            });

            if (duration) {
                const file = await prisma.file.findUnique({
                    where: { fileId },
                    select: { duration: true }
                });

                if (file && Math.abs(file.duration - duration) > DURATION_DIFF) {
                    const user = await prisma.user.findUnique({
                        where: { id: Number(userId) },
                        select: { email: true }
                    });

                    const ses = getAWSSesInstance();
                    await ses.sendAlert(
                        `File Duration Difference`,
                        `Duration difference detected for file ${fileId} uploaded by ${user?.email}. Original duration: ${file.duration}s, Converted duration: ${duration}s, Difference: ${Math.abs(file.duration - duration)}s`,
                        'software'
                    );

                    logger.info(
                        `${fileId} - File flagged for duration difference::${ERROR_CODES.DURATION_DIFF_ERROR.code}::${ERROR_CODES.DURATION_DIFF_ERROR.httpCode}`
                    );
                }
            }
        } else {
            await prisma.file.update({
                where: { fileId },
                data: { converted: false }
            }).catch(updateError => {
                logger.error(`Error updating file conversion failure status: ${updateError}`);
            });

            const result = await refundFile(fileId)
            if (result.success && result.refundDetails) {
                const user = await prisma.user.findUnique({
                    where: { id: Number(userId) },
                    select: { email: true }
                });

                const emailData = {
                    userEmailId: user?.email ?? '',
                }

                const templateData = {
                    filename: result.refundDetails.fileName,
                    amount: result.refundDetails.amount.toFixed(2),
                    invoiceId: result.refundDetails.invoiceId
                }

                const ses = getAWSSesInstance();
                await ses.sendMail('REFUND_FILE', emailData, templateData)
            }
        }
    } catch (error) {
        logger.error(`Error processing conversion-worker result for fileId ${fileId}:`, error);
        throw error;
    }
}

export async function POST(req: NextRequest) {
    // Authenticate webhook and check rate limit
    const authResult = await authenticateWebhook(req, 'CONVERSION-WORKER');
    if (authResult.error) return authResult.error;

    const conversionResult = await req.json();

    try {
        if (!conversionResult || !conversionResult.status) {
            return NextResponse.json({ error: 'Invalid conversion result' }, { status: 400 });
        }

        await processConversionResult(conversionResult);

        logger.info(`Conversion-worker webhook processed successfully for file ID ${conversionResult.fileId}`);
        return NextResponse.json(null, { status: 200 });
    } catch (error) {
        logger.error(`Error processing conversion-worker webhook for file ID ${conversionResult?.fileId} and user ID ${conversionResult?.userId}:`, error);
        return NextResponse.json({ error: `Error processing conversion-worker webhook for file ID ${conversionResult?.fileId} and user ID ${conversionResult?.userId}` }, { status: 500 });
    }
}