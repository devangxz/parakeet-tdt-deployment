import { OrderStatus } from '@prisma/client';
import { NextResponse } from 'next/server';

import logger from '@/lib/logger';
import prisma from '@/lib/prisma';
import { submitFinalize } from '@/services/editor-service/submit-finalize-file';
import submitReview from '@/services/editor-service/submit-review-file';

export async function POST(req: Request) {
    logger.info('--> submitFinalize');

    try {
        const { orderId, fileId } = await req.json();
        const userToken = req.headers.get('x-user-token');
        const user = JSON.parse(userToken ?? '{}');
        const transcriberId = user?.userId;

        if (!fileId) {
            return NextResponse.json({ error: 'File ID and transcript are required' }, { status: 400 });
        }

        const order = await prisma.order.findUnique({
            where: {
                id: Number(orderId),
            },
        });

        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 400 });
        }

        if (order.status === OrderStatus.REVIEWER_ASSIGNED) {
            const { success, message } = await submitReview(transcriberId, order)

            if (!success) {
                return NextResponse.json({ error: message }, { status: 400 });
            }
        } else {
            const { success, message } = await submitFinalize(transcriberId, order);
            if (!success) {
                return NextResponse.json({ error: message }, { status: 400 });
            }
        }

        logger.info('<-- submitFinalize');
        return NextResponse.json({ message: 'Review submitted' }, { status: 201 });
    } catch (error) {
        logger.error('Error in submitFinalize:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
