'use server'

import { revalidatePath } from 'next/cache'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import isValidEmail from '@/utils/isValidEmail'

interface RemoveQCFromOrgParams {
  qcEmail: string
  orgName: string
}

export async function removeQCFromOrg({
  qcEmail,
  orgName,
}: RemoveQCFromOrgParams) {
  if (!isValidEmail(qcEmail)) {
    logger.error(`Invalid email: ${qcEmail}`)
    return { success: false, message: 'Invalid email' }
  }

  try {
    // Find the QC user
    const qcUser = await prisma.user.findUnique({
      where: { email: qcEmail },
      include: {
        Verifier: true,
      },
    })

    if (!qcUser || !qcUser.Verifier) {
      logger.error(`QC not found or not a verifier: ${qcEmail}`)
      return { success: false, message: 'QC not found or not a verifier' }
    }

    const currentEnabledCustomers = qcUser.Verifier.enabledCustomers || ''

    // Check if this org is already in the list
    if (!currentEnabledCustomers.includes(orgName)) {
      return {
        success: false,
        message: 'This QC is not assigned to this organization',
      }
    }

    // Remove the org from the enabledCustomers string (comma-separated list)
    const customersArray = currentEnabledCustomers.split(',')
    const updatedCustomersArray = customersArray.filter(
      (customerName: string) => customerName.trim() !== orgName.trim()
    )
    const updatedEnabledCustomers = updatedCustomersArray.join(',')

    // Update the verifier record
    await prisma.verifier.update({
      where: { userId: qcUser.id },
      data: {
        enabledCustomers: updatedEnabledCustomers,
      },
    })

    // Revalidate the page
    revalidatePath('/admin/org-dashboard')

    logger.info(`Successfully removed ${qcEmail} from organization ${orgName}`)
    return {
      success: true,
      message: `Successfully removed QC from organization`,
    }
  } catch (error) {
    logger.error('Error removing QC from org:', error)
    return {
      success: false,
      message: 'Failed to remove QC from organization',
    }
  }
}
