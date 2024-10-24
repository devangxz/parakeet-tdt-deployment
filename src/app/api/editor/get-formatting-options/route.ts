export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server';

import logger from '@/lib/logger';
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
    let orderId = 0
    try {
        const searchParams = req.nextUrl.searchParams;
        orderId = Number(searchParams.get('orderId'));
        const DEFAULT_TEMPLATE = { name: 'Scribie Single Line Spaced', id: 1 };

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
        const templateId = options.tmp || null;

        if (!templateId) {
            logger.error(`Template not found for file ${order.fileId}`);
            return NextResponse.json({ error: 'Template not found' }, { status: 404 });
        }

        const allPublicTemplates = await prisma.template.findMany({
            where: {
                userId: {
                    equals: null
                }
            },
            select: { name: true, id: true },
        });

        const currentTemplate = allPublicTemplates.find((template) => template.id === templateId);

        return NextResponse.json({ options, templates: allPublicTemplates, currentTemplate: (currentTemplate ? currentTemplate : DEFAULT_TEMPLATE) });
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
