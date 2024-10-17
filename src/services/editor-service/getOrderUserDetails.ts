import logger from "@/lib/logger";
import prisma from "@/lib/prisma";

interface OrderDetails {
    order_id: number;
    order_type: string;
    file_id: string;
    file_name: string;
    org_name: string;
    template_name: string;
    status: string;
    instructions: string;
    user_id: number;
}

async function getOrderUserDetails(
    orderId: number
): Promise<OrderDetails> {
    logger.info(`--> getOrderUserDetails ${orderId}`);
    let resultJson: OrderDetails = {
        order_id: 0,
        order_type: '',
        file_id: '',
        file_name: '',
        org_name: '',
        template_name: '',
        status: '',
        instructions: '',
        user_id: 0,
    };
    try {
        // Get order details
        const order = await prisma.order.findUnique({
            where: {
                id: Number(orderId),
            },
            include: {
                File: true,
                user: true,
            },
        });

        if (!order) {
            logger.error(`Order not found for ${orderId}`)
            throw new Error('Order not found');
        }
        // Get template details
        let templateName = '';
        const customInstructions = JSON.parse(
            order?.File?.customInstructions || '{}',
        );
        if (Object.keys(customInstructions).length !== 0) {
            const templateId = customInstructions?.templateId;
            const template = await prisma.template.findUnique({
                where: { id: Number(templateId) },
                select: { name: true },
            });
            if (template) {
                templateName = template.name;
            } else {
                logger.info('Template not found for the provided template ID.');
            }
        }
        // Get organisation details
        let orgName = '';
        const org = await prisma.organization.findUnique({
            where: {
                userId: order?.userId,
            },
            select: {
                name: true,
            },
        });

        if (org) {
            orgName = org.name;
        } else {
            logger.info(`'No organization name'}`);
        }

        logger.info(`${order?.orderType} ${order?.userId} ${orgName}`);
        logger.info(
            `${order?.fileId} ${order?.File?.filename} ${templateName} ${order?.user.email}`,
        );
        resultJson = {
            order_id: order?.id ?? 0,
            order_type: order?.orderType ?? '',
            file_id: order?.fileId ?? '',
            file_name: order?.File?.filename ?? '',
            org_name: orgName.toLowerCase(),
            template_name: templateName,
            status: order?.status ?? '',
            instructions: order?.instructions ?? '',
            user_id: order?.userId ?? 0,
        };
    } catch (error) {
        logger.error('Details could not be fetched');
    }
    logger.info(`<-- getOrderUserDetails ${orderId}`);
    return resultJson;
}

export default getOrderUserDetails;