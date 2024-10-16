import { NextResponse } from 'next/server';

import logger from '@/lib/logger';
import prisma from '@/lib/prisma';

interface SpeakerName {
    [key: string]: string;
}

interface RequestBody {
    fileId: string;
    speakerName: SpeakerName;
}

export async function POST(req: Request) {
    try {
        const body: RequestBody = await req.json();
        const { fileId, speakerName } = body;

        const invoiceFile = await prisma.invoiceFile.findFirst({
            where: {
                fileId: fileId,
            },
            select: {
                invoiceId: true,
            },
        });

        if (!invoiceFile) {
            return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
        }

        const speakerObjects = Object.entries(speakerName).map(([, value]) => {
            const [firstName, ...lastNameParts] = value.trim().split(' ');
            const lastName = lastNameParts.join(' ');
            return {
                fn: firstName || '',
                ln: lastName || ''
            };
        });

        const currentInvoice = await prisma.invoice.findUnique({
            where: {
                invoiceId: invoiceFile.invoiceId,
            },
            select: {
                options: true,
            },
        });

        if (!currentInvoice) {
            throw new Error('Invoice not found');
        }

        const currentOptions = JSON.parse(currentInvoice.options || '{}');
        const updatedOptions = {
            ...currentOptions,
            sn: {
                ...currentOptions.sn,
                [fileId]: speakerObjects,
            },
        };

        await prisma.invoice.update({
            where: {
                invoiceId: invoiceFile.invoiceId,
            },
            data: {
                options: JSON.stringify(updatedOptions),
            },
        });

        return NextResponse.json({ message: 'Successfully updated speaker name' });
    } catch (error) {
        logger.error(error);
        return NextResponse.json({ error: 'Failed to update speaker name' }, { status: 500 });
    }
}
