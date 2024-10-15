import { Order, OrderStatus } from '@prisma/client'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { getTeamAdminUserDetails } from '@/utils/backend-helper'

async function isPredeliveryEligible(userId: string): Promise<boolean> {
  logger.info(`--> isPredeliveryEligible: ${userId}`)
  const teamAdminDetails = userId
    ? await getTeamAdminUserDetails(Number(userId))
    : null

  logger.info(`teamAdminDetails: ${teamAdminDetails}`)

  // User has switched to a team
  const customerId = teamAdminDetails ? teamAdminDetails.userId : userId
  const customer = await prisma.customer.findUnique({
    where: { userId: Number(customerId) },
    select: { isPreDeliveryEligible: true },
  })
  if (!customer) {
    logger.error(`Customer not found with userId ${customerId}`)
    return false
  }

  logger.info(
    `--> isPredeliveryEligible: ${customerId} ${customer.isPreDeliveryEligible}`
  )

  return customer.isPreDeliveryEligible
}

async function preDeliverIfConfigured(
  order: Order,
  transcriberId: number
): Promise<boolean> {
  logger.info(`--> preDeliverIfConfigured ${order.id} ${order.fileId}`)

  if ((await isPredeliveryEligible(String(order.userId))) == true) {
    logger.info('Order is marked for pre-delivery check')

    await prisma.order.update({
      where: { id: order.id },
      data: {
        deliveredTs: new Date(),
        deliveredBy: transcriberId,
        status: OrderStatus.PRE_DELIVERED,
        updatedAt: new Date(),
      },
    })
    logger.info(`<-- preDeliverIfConfigured ${order.id} ${order.fileId}`)
    return true
  }
  logger.info(`<-- preDeliverIfConfigured ${order.id} ${order.fileId}`)
  return false
}

export default preDeliverIfConfigured
