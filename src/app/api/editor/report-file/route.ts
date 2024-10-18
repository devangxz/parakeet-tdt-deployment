import { OrderStatus } from '@prisma/client';
import { NextResponse } from 'next/server';

import logger from '@/lib/logger';
import prisma from '@/lib/prisma'

export async function POST(req: Request) {
    try {
        const { reportOption, reportComment, orderId } = await req.json();

        if (!reportComment || !reportOption) {
            logger.error('Missing report comment or report option');
            return NextResponse.json(
                { success: false, message: 'Missing report comment or report option' },
                { status: 400 }
            );
        }

        await prisma.order.update({
            where: { id: orderId },
            data: {
                reportOption,
                reportComment,
                status: OrderStatus.SUBMITTED_FOR_SCREENING
            },
        });

        return NextResponse.json(
            { success: true, message: 'Order reported successfully' },
            { status: 200 }
        );
    } catch (err) {
        logger.error(
            `An error occurred while reporting the order: ${(err as Error).message}`
        );
        return NextResponse.json(
            { success: false, message: 'Failed to report the order.' },
            { status: 500 }
        );
    }
}
