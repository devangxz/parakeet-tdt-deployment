'use server'

import bcrypt from 'bcryptjs'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { generateUniqueId } from '@/utils/generateUniqueId'

export async function getInviteDetails(inviteKey: string) {
  try {
    const invite = await prisma.invite.findUnique({
      where: { inviteKey },
    })

    if (!invite || !invite.email) {
      logger.error(`Invite not found for key ${inviteKey}`)
      return {
        success: false,
        error: 'Invite not found for the given key',
      }
    }

    if (invite.accepted) {
      return {
        success: false,
        redirect: '/account/sign-in',
      }
    }

    const user = await prisma.user.findUnique({
      where: { email: invite.email },
    })

    if (!user) {
      logger.error(`User not found for email ${invite.email}`)
      return {
        success: false,
        error: 'User not found for the given email',
      }
    }

    if (user.status !== 'CREATED') {
      logger.info(`User ${user.id} is already a member of a team`)
      return {
        success: false,
        redirect: '/account/sign-in',
      }
    }

    const teamMember = await prisma.teamMember.findFirst({
      where: { userId: user.id },
    })

    if (!teamMember) {
      logger.error(`Team ID not found for user ${user.id}`)
      return {
        success: false,
        error: 'Invite not found for the given key',
      }
    }

    const team = await prisma.team.findUnique({
      where: { id: teamMember.teamId },
      include: {
        members: {
          include: {
            user: true,
          },
        },
      },
    })

    if (!team) {
      logger.error(`Team not found for user ${user.id}`)
      return {
        success: false,
        error: 'Team not found for the given user',
      }
    }

    const owner = team.members.find((member) => member.userId === team.owner)

    if (!owner) {
      logger.error(`Team owner not found for team ${team.id}`)
      return {
        success: false,
        error: 'Team owner not found',
      }
    }

    const info = {
      email: invite.email,
      userId: user.id,
      teamId: team.id,
      ownerEmail: owner.user.email,
      ownerFullname: `${owner.user.firstname || ''} ${
        owner.user.lastname || ''
      }`.trim(),
      ownerFirstname: owner.user.firstname || '',
      ownerName:
        `${owner.user.firstname || ''} ${owner.user.lastname || ''}`.trim() ||
        owner.user.email,
    }

    return {
      success: true,
      details: info,
    }
  } catch (error) {
    logger.error(error)
    return {
      success: false,
      error: 'The group invite is not valid',
    }
  }
}

export async function joinTeam({
  firstname,
  lastname,
  password,
  email,
}: {
  firstname: string
  lastname: string
  password: string
  email: string
}) {
  if (!firstname || !lastname || !password || !email) {
    return { success: false, message: 'All fields are required' }
  }

  const referralCode = generateUniqueId()

  try {
    const salt = bcrypt.genSaltSync(10)
    const hash = bcrypt.hashSync(password, salt)

    await prisma.$transaction(async (prisma) => {
      const user = await prisma.user.update({
        where: { email },
        data: {
          pass: hash,
          salt: salt,
          firstname,
          lastname,
          status: 'VERIFIED',
          referralCode,
        },
      })

      await prisma.teamMember.updateMany({
        where: { userId: user.id },
        data: { status: 'ACCEPTED' },
      })

      await prisma.invite.updateMany({
        where: { email },
        data: { accepted: true },
      })

      await prisma.customer.create({
        data: { userId: user.id },
      })

      return user
    })

    return { success: true, message: 'Successfully joined team' }
  } catch (error) {
    logger.error(error)
    return {
      success: false,
      message: 'An error occurred. Please try after some time.',
    }
  }
}
