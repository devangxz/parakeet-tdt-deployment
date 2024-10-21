import { getTeamAdminUserDetails } from "./backend-helper";
import logger from "@/lib/logger";
import prisma from "@/lib/prisma";

export default async function isPredeliveryEligible(userId: string): Promise<boolean> {
    logger.info(`--> isPredeliveryEligible: ${userId}`);
    // Try to get the team to which the user last switched to.
    // If the user is in own workspace and not in any team, getTeamAdminUserDetails will return null
    const teamAdminDetails = userId
        ? await getTeamAdminUserDetails(Number(userId))
        : null;

    logger.info(`teamAdminDetails: ${teamAdminDetails}`);

    // User has switched to a team
    const customerId = teamAdminDetails ? teamAdminDetails.userId : userId;
    const customer = await prisma.customer.findUnique({
        where: { userId: Number(customerId) },
        select: { isPreDeliveryEligible: true },
    });
    if (!customer) {
        logger.error(`Customer not found with userId ${customerId}`);
        return false;
    }

    logger.info(
        `--> isPredeliveryEligible: ${customerId} ${customer.isPreDeliveryEligible}`,
    );

    return customer.isPreDeliveryEligible;
}