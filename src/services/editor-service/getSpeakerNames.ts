import logger from "@/lib/logger";
import prisma from "@/lib/prisma";

export default async function getSpeakerNames(fileId: string) {
    try {
        const invoiceFile = await prisma.invoiceFile.findFirst({
            where: {
                fileId: fileId,
            },
            select: {
                invoiceId: true,
            },
        });

        if (!invoiceFile) {
            return {
                success: false,
                message: `Invoice not found`
            };
        }

        const invoice = await prisma.invoice.findUnique({
            where: {
                invoiceId: invoiceFile.invoiceId,
            },
            select: {
                options: true,
            },
        });

        if (!invoice) {
            return {
                success: false,
                message: `Invoice not found`
            };
        }

        const speakerNames = JSON.parse(invoice.options ?? '{}').sn;

        return {
            success: true,
            data: speakerNames
        }
    } catch (error) {
        if (error instanceof Error) {
            logger.error(`Error fetching speaker names for file ${fileId}: ${error.message}`);
            return {
                success: false,
                message: `Error fetching speaker names for file ${fileId}: ${error.message}`
            };
        }
        logger.error(`Unknown error fetching speaker names for file ${fileId}`);
        return {
            success: false,
            message: `Unknown error fetching speaker names for file ${fileId}`
        };
    }

}