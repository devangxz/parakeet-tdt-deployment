import { NextRequest, NextResponse } from 'next/server';

import logger from '@/lib/logger';
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
    let orderId = 0
    try {
        const searchParams = req.nextUrl.searchParams;
        orderId = Number(searchParams.get('orderId'));

        if (!orderId) {
            logger.error(`Missing orderId parameter`);
            return NextResponse.json({ error: 'Missing orderId parameter' }, { status: 400 });
        }

        const order = await prisma.order.findUnique({
            where: {
                id: Number(orderId),
            },
            select: {
                fileId: true,
            },
        });

        if (!order) {
            logger.error(`Order not found for ${orderId}`);
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        const invoiceFile = await prisma.invoiceFile.findFirst({
            where: {
                fileId: order.fileId,
            },
            select: {
                invoiceId: true,
            },
        });

        if (!invoiceFile) {
            logger.error(`Invoice not found for file ${order.fileId}`);
            return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
        }

        const invoice = await prisma.invoice.findUnique({
            where: {
                invoiceId: invoiceFile.invoiceId,
            },
        });

        if (!invoice) {
            logger.error(`Invoice not found for file ${order.fileId}`);
            return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
        }

        const options = JSON.parse(invoice.options ?? '{}');

        return NextResponse.json(options);
    } catch (err) {
        logger.error(
            `An error occurred while fetching order option for order ${orderId}: ${(err as Error).message}`
        );
        return NextResponse.json(
            { success: false, message: 'Failed to fetch order options' },
            { status: 500 }
        );
    }
}
