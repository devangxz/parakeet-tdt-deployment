import { File, InputFileType, JobStatus, JobType, Order, OrderStatus, ReportMode, ReportOption } from '@prisma/client'
import axios from 'axios'

import { FILE_CACHE_URL } from '@/constants'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { getAWSSesInstance } from '@/lib/ses'
import calculateTranscriberCost from '@/utils/caculateTranscriberCost'
import getCustomerTranscript from '@/utils/getCustomerTranscript'
import isPredeliveryEligible from '@/utils/isPredeliveryEligible'
import qualityCriteriaPassed from '@/utils/qualityCriteriaPassed'

type OrderWithFileData = Order & {
    File: File | null;
} | null;

async function deliver(order: Order, transcriberId: number) {
    logger.info(`--> deliver ${order.id} ${order.fileId}`);
    await prisma.order.update({
        where: { id: order.id },
        data: {
            deliveredTs: new Date(),
            deliveredBy: transcriberId,
            status: OrderStatus.DELIVERED,
        }
    });
    const file = await prisma.file.findUnique({ where: { fileId: order.fileId } });

    const templateData = {
        transcript_name: file?.filename || '',
        check_and_download: `https://${process.env.SERVER}/files/all-files/?ids=${file?.fileId}`,
    };

    const user = await prisma.user.findUnique({
        where: {
            id: order.userId,
        },
        select: {
            email: true,
        },
    });

    const userEmail = user?.email || ''

    const ses = getAWSSesInstance()

    await ses.sendMail('ORDER_PROCESSED', { userEmailId: userEmail }, templateData)

    logger.info(`<-- deliver ${order.id} ${order.fileId}`);
}

async function preDeliver(order: Order, transcriberId: number) {
    logger.info(`--> preDeliver ${order.id} ${order.fileId}`);
    await prisma.order.update({
        where: { id: order.id },
        data: {
            deliveredTs: new Date(),
            deliveredBy: transcriberId,
            status: OrderStatus.PRE_DELIVERED,
        },

    });
    logger.info(`<-- preDeliver ${order.id} ${order.fileId}`);
}

async function preDeliverIfConfigured(
    order: Order,
    transcriberId: number,
): Promise<boolean> {
    logger.info(`--> preDeliverIfConfigured ${order.id} ${order.fileId}`);

    if (
        (await isPredeliveryEligible(String(order.userId))) == true
    ) {
        logger.info('Order is marked for pre-delivery check');
        await preDeliver(order, transcriberId);
        logger.info(`<-- preDeliverIfConfigured ${order.id} ${order.fileId}`);
        return true;
    }
    logger.info(`<-- preDeliverIfConfigured ${order.id} ${order.fileId}`);
    return false;
}

const assignFileToReviewer = async (
    orderId: number,
    fileId: string,
    transcriberId: number,
    inputFile: InputFileType,
    changeOrderStatus: boolean = true,
    userEmail: string
) => {
    logger.info(`--> assignFileToReviewer ${orderId} ${transcriberId}`);
    try {
        await prisma.$transaction(async (prisma) => {
            if (changeOrderStatus) {
                await prisma.order.update({
                    where: { id: orderId },
                    data: {
                        status: OrderStatus.REVIEWER_ASSIGNED,
                    },
                });
            }

            await prisma.jobAssignment.create({
                data: {
                    orderId,
                    type: JobType.REVIEW,
                    transcriberId: transcriberId,
                    inputFile: inputFile,
                },
            });
        });

        const templateData = {
            fileId,
        };

        const ses = getAWSSesInstance()
        await ses.sendMail('REVIEWER_ASSIGNMENT', { userEmailId: userEmail }, templateData)

        logger.info(`--> assignFileToReviewer ${orderId} ${transcriberId}`);
        return true;
    } catch (error) {
        logger.error(`--> assignFileToReviewer ` + error);
        return false;
    }
}

async function completeQCJob(order: Order, transcriberId: number) {
    logger.info(`--> completeQCJob ${transcriberId}`);
    await prisma.$transaction(async (prisma) => {
        const orderWithFileData = await prisma.order.findUnique({
            where: { id: order.id },
            include: {
                File: true,
            },
        });

        const qcCost = await calculateTranscriberCost(
            orderWithFileData as OrderWithFileData,
            transcriberId,
        );
        await prisma.jobAssignment.updateMany({
            where: {
                orderId: order.id,
                transcriberId,
                type: JobType.QC,
                status: JobStatus.ACCEPTED,
            },
            data: {
                status: JobStatus.COMPLETED,
                earnings: qcCost.cost,
                completedTs: new Date(),
            },
        });
        await prisma.order.update({ where: { id: order.id }, data: { status: OrderStatus.QC_COMPLETED } });
        const user = await prisma.user.findFirst({ where: { id: transcriberId } })
        const userEmail = user?.email || ''

        await assignFileToReviewer(
            order.id,
            order.fileId,
            transcriberId,
            InputFileType.LLM_OUTPUT,
            false,
            userEmail,
        );

        logger.info(`sending TRANSCRIBER_SUBMIT mail to ${userEmail} for user ${transcriberId}`)

        const templateData = {
            file_id: order.fileId,
        };
        const ses = getAWSSesInstance()
        await ses.sendMail('TRANSCRIBER_SUBMIT', { userEmailId: userEmail }, templateData)

    });

    logger.info(`<-- completeQCJob ${transcriberId}`);
}

export async function submitFile(orderId: number, transcriberId: number, transcript: string) {
    try {

        const order = await prisma.order.findUnique({
            where: {
                id: orderId,
            },
            include: {
                File: true,
            },
        })

        if (!order) {
            logger.error(`No order found with the given order ID ${orderId}`)
            return {
                success: false,
                message: 'Order not found',
            }
        }

        await axios.post(`${FILE_CACHE_URL}/save-transcript`, {
            fileId: order.fileId,
            transcript: transcript,
            userId: transcriberId

        }, {
            headers: {
                'x-api-key': process.env.SCRIBIE_API_KEY
            }
        });

        const customerTranscript = await getCustomerTranscript(
            order.fileId,
            transcript,
        );

        await axios.post(`${FILE_CACHE_URL}/save-transcript`, {
            fileId: order.fileId,
            transcript: customerTranscript,
            userId: order.userId

        }, {
            headers: {
                'x-api-key': process.env.SCRIBIE_API_KEY
            }
        });

        const testResult = await qualityCriteriaPassed(order.fileId);

        if (testResult.result === false) {
            logger.info(`Quality Criteria failed ${order.fileId}`);

            const qcCost = await calculateTranscriberCost(order, transcriberId);

            await prisma.$transaction(async (prisma) => {
                await prisma.order.update({
                    where: {
                        id: order.id,
                    },
                    data: {
                        reportMode: ReportMode.AUTO,
                        reportOption: ReportOption.AUTO_DIFF_BELOW_THRESHOLD,
                        reportComment: testResult.details,
                        status: OrderStatus.SUBMITTED_FOR_APPROVAL,
                    }
                });
                // QC's Earnings is not updated here. It will be updated only when the OM approves
                await prisma.jobAssignment.updateMany({
                    where: {
                        orderId: order.id,
                        transcriberId,
                        type: JobType.QC,
                        status: JobStatus.ACCEPTED,
                    },
                    data: {
                        status: JobStatus.SUBMITTED_FOR_APPROVAL,
                        earnings: qcCost.cost,
                        completedTs: new Date(),
                    },
                });
            });
            logger.info(
                `<-- OrderTranscriptionFlow:submitQC - OrderStatus.SUBMITTED_FOR_APPROVAL`,
            );
            return;
        }

        await completeQCJob(order, transcriberId);
        if ((await preDeliverIfConfigured(order, transcriberId)) === false) {
            await deliver(order, transcriberId);
        }

    } catch (error) {
        logger.error(`Failed to fetch ${status} files:`, error)
        return {
            success: false,
            message: 'Failed to fetch files',
        }
    }

}