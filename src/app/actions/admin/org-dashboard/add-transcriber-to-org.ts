'use server'

import { revalidatePath } from 'next/cache'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import isValidEmail from '@/utils/isValidEmail'

interface AddTranscriberToOrgParams {
  transcriberEmail: string
  orgName: string
}

export async function addTranscriberToOrg({
  transcriberEmail,
  orgName,
}: AddTranscriberToOrgParams) {
  if (!isValidEmail(transcriberEmail)) {
    logger.error(`Invalid email: ${transcriberEmail}`)
    return { success: false, message: 'Invalid email' }
  }

  try {
    // Find the transcriber user
    const user = await prisma.user.findUnique({
      where: { email: transcriberEmail },
      include: {
        Verifier: true,
      },
    })

    if (!user) {
      logger.error(`User not found: ${transcriberEmail}`)
      return { success: false, message: 'User not found' }
    }

    // If the user doesn't have a verifier record yet, create one
    if (!user.Verifier) {
      await prisma.verifier.create({
        data: {
          userId: user.id,
          enabledCustomers: orgName,
          qcType: 'FREELANCER',
        },
      })

      logger.info(
        `Created new verifier record for ${transcriberEmail} with org ${orgName}`
      )
      revalidatePath('/admin/org-dashboard')
      return {
        success: true,
        message: 'Successfully added transcriber to organization',
      }
    }

    // If the user already has a verifier record, update it
    const currentEnabledCustomers = user.Verifier.enabledCustomers || ''

    // Check if this org is already in the list
    if (currentEnabledCustomers.includes(orgName)) {
      return {
        success: false,
        message: 'This transcriber is already assigned to this organization',
      }
    }

    // Add the org to the enabledCustomers string (comma-separated list)
    const updatedEnabledCustomers = currentEnabledCustomers
      ? `${currentEnabledCustomers},${orgName}`
      : orgName

    // Update the verifier record
    await prisma.verifier.update({
      where: { userId: user.id },
      data: {
        enabledCustomers: updatedEnabledCustomers,
      },
    })

    // Revalidate the page
    revalidatePath('/admin/org-dashboard')

    logger.info(
      `Successfully added ${transcriberEmail} to organization ${orgName}`
    )
    return {
      success: true,
      message: 'Successfully added transcriber to organization',
    }
  } catch (error) {
    logger.error('Error adding transcriber to org:', error)
    return {
      success: false,
      message: 'Failed to add transcriber to organization',
    }
  }
}
