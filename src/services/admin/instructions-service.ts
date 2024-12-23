/* eslint-disable @typescript-eslint/no-explicit-any */
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

interface UpdateInstructionsParams {
  id: string | number
  instructions: string
}

export async function updateInstructions({
  id,
  instructions,
}: UpdateInstructionsParams) {
  let filter = {}

  if (!isNaN(Number(id))) {
    filter = { id: parseInt(id as string) }
  } else {
    filter = { email: id }
  }

  try {
    const user = await prisma.user.findUnique({
      where: filter as any,
      include: { Customer: true, Order: true, File: true },
    })

    if (!user) {
      logger.error(`User not found with id or email '${id}'`)
      return {
        success: false,
        s: `User with id or email '${id}' does not exist`,
      }
    }

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        splInstructions: instructions,
      },
    })

    logger.info(`Added special instructions for ${user.email}, ${user.id}`)

    return {
      success: true,
      s: 'Special instructions added successfully',
    }
  } catch (error) {
    logger.error('Error updating instructions:', error)
    return { success: false, s: 'Failed to update instructions' }
  }
}
