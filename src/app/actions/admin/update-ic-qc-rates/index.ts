'use server'
import { QCType } from '@prisma/client'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function getICQCRate(email: string) {
  try {
    const user = await prisma.user.findUnique({
      where: {
        email: email,
      },
      include: {
        Verifier: true,
      },
    })

    if (!user) {
      return {
        success: false,
        message: 'User not found',
      }
    }

    if (!user.Verifier) {
      return {
        success: false,
        message: 'Verifier not found',
      }
    }

    return {
      success: true,
      qcRate: user.Verifier.qcRate,
      cfRate: user.Verifier.cfRate,
      cfRRate: user.Verifier.cfRRate,
    }
  } catch (error) {
    logger.error(`Error while getting ic qc rates ${email} ${error}`)
    return {
      success: false,
      message: 'An error occurred. Please try again after some time.',
      customers: '',
    }
  }
}

export async function updateICQCRate(
  email: string,
  qcRate: number,
  cfRate: number,
  cfRRate: number
) {
  try {
    const user = await prisma.user.findUnique({
      where: {
        email: email,
      },
      include: {
        Verifier: true,
      },
    })

    if (!user) {
      return {
        success: false,
        message: 'User not found',
      }
    }

    if (!user.Verifier) {
      return {
        success: false,
        message: 'Verifier not found',
      }
    }

    await prisma.verifier.update({
      where: {
        userId: user.id,
      },
      data: {
        qcRate: qcRate,
        cfRate: cfRate,
        cfRRate: cfRRate,
        qcType: QCType.CONTRACTOR,
      },
    })

    return {
      success: true,
      message: 'Successfully updated rates',
    }
  } catch (error) {
    logger.error(`Error while updating ic qc rates ${email} ${error}`)
    return {
      success: false,
      message: 'An error occurred. Please try again after some time.',
    }
  }
}
