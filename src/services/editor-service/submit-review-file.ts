import { FileTag, JobStatus, JobType, Order, OrderStatus, OrderType } from "@prisma/client";

import logger from "@/lib/logger";
import prisma from "@/lib/prisma";
import { sendTemplateMail } from "@/lib/ses";
import calculateTranscriberCost from "@/utils/calculateTranscriberCost";

export default async function submitReview(transcriberId: number, order: Order) {
    logger.info(
        `--> OrderTranscriptionCFFlow:submitReview ${order.fileId}`,
    );
    try {
        if (order.orderType != OrderType.TRANSCRIPTION_FORMATTING) {
            logger.error(
                `OrderFlow:submitReview - Order ${order.id}-${order.orderType} is not supported`,
            );
            return {
                success: false,
                message: `Order ${order.id} is not supported`,
            }
        }

        if (order.status === OrderStatus.REVIEW_COMPLETED) {
            logger.error(
                `OrderFlow:submitReview - Order ${order.id}-${order.fileId} has already been submitted by review`,
            );
            return {
                success: false,
                message: `Order ${order.id} has already been submitted by review`,
            }
        }

        const assignment = await prisma.jobAssignment.findFirst({
            where: {
                orderId: order.id,
                transcriberId,
                type: JobType.REVIEW,
                status: JobStatus.ACCEPTED,
            },
        });

        if (!assignment) {
            logger.error(
                `OrderFlow:submitReview - Unauthorized try to submit a review file by user ${transcriberId} for order ${order.id}`,
            );
            throw new Error(`OrderFlow: submitReview - Unauthorized try to submit a review file by user ${transcriberId} for order ${order.id}`)
        }

        const fileVersion = await prisma.fileVersion.findFirst({
            where: {
                fileId: order.fileId,
                tag: FileTag.CF_REV_SUBMITTED,
                userId: transcriberId,
            },
            orderBy: {
                updatedAt: 'desc',
            },
        });

        if (!fileVersion?.s3VersionId) {
            logger.error(`OrderFlow:submitReview - Review docx file ${order.fileId} has not been uploaded yet`);
            throw new Error(`OrderFlow:submitReview - Review docx file ${order.fileId} has not been uploaded yet`)
        }

        await prisma.$transaction(async (prisma) => {
            const orderFile = await prisma.order.findUnique({
                where: { id: order.id },
                include: {
                    File: true,
                },
            });

            const cf_cost = await calculateTranscriberCost(orderFile, transcriberId);

            await prisma.jobAssignment.updateMany({
                where: {
                    orderId: order.id,
                    transcriberId,
                    type: JobType.REVIEW,
                    status: JobStatus.ACCEPTED,
                },
                data: {
                    status: JobStatus.COMPLETED,
                    earnings: cf_cost.cost,
                    completedTs: new Date(),
                },
            });
            await prisma.order.update({
                where: { id: order.id },
                data: {
                    status: OrderStatus.REVIEW_COMPLETED,
                },
            });
        });
        const templateData = {
            file_id: order.fileId,
        };
        await sendTemplateMail(
            'TRANSCRIBER_SUBMIT',
            transcriberId,
            templateData,
        );

        return {
            success: true,
            message: `Review order ${order.id} submitted successfully`,
        }
    } catch (error) {
        logger.error(
            `OrderTranscriptionCFFlow:submitReview ${order.id}-${order.fileId} ${(error as Error).toString()}`,
        );
        return {
            success: false,
            message: `Failed to submit review order ${order.id}: ${error}`,
        }
    }
}