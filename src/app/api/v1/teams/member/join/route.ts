import bcrypt from 'bcryptjs'
import { NextRequest, NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { generateUniqueId } from '@/utils/generateUniqueId'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const inviteKey = searchParams.get('inviteKey')

    if (!inviteKey) {
      return NextResponse.json(
        { message: 'Invite key is required' },
        { status: 400 }
      )
    }

    const invite = await prisma.invite.findUnique({
      where: { inviteKey },
    })

    if (!invite || !invite.email) {
      logger.error(`Invite not found for key ${inviteKey}`)
      return NextResponse.json(
        { message: 'Invite not found for the given key' },
        { status: 404 }
      )
    }

    if (invite.accepted) {
      return NextResponse.json(
        { message: 'Invite already accepted', redirect: '/account/sign-in' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email: invite.email },
    })

    if (!user) {
      logger.error(`User not found for email ${invite.email}`)
      return NextResponse.json(
        { message: 'User not found for the given email' },
        { status: 404 }
      )
    }

    if (user.status !== 'CREATED') {
      logger.info(`User ${user.id} is already a member of a team`)
      return NextResponse.json(
        { message: 'User already active', redirect: '/account/sign-in' },
        { status: 400 }
      )
    }

    const teamMember = await prisma.teamMember.findFirst({
      where: { userId: user.id },
    })

    if (!teamMember) {
      logger.error(`Team ID not found for user ${user.id}`)
      return NextResponse.json(
        { message: 'Invite not found for the given key' },
        { status: 404 }
      )
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
      return NextResponse.json(
        { message: 'Team not found for the given user' },
        { status: 404 }
      )
    }

    const owner = team.members.find((member) => member.userId === team.owner)

    if (!owner) {
      logger.error(`Team owner not found for team ${team.id}`)
      return NextResponse.json(
        { message: 'Team owner not found' },
        { status: 404 }
      )
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

    return NextResponse.json({ details: info })
  } catch (error) {
    logger.error(error)
    return NextResponse.json(
      { message: 'The group invite is not valid' },
      { status: 400 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const { firstname, lastname, password, email } = await req.json()

    if (!firstname || !lastname || !password || !email) {
      return NextResponse.json(
        { message: 'All fields are required' },
        { status: 400 }
      )
    }

    const referralCode = generateUniqueId()
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

    return NextResponse.json({ message: 'Successfully joined team' })
  } catch (error) {
    logger.error(error)
    return NextResponse.json(
      { message: 'An error occurred. Please try after some time.' },
      { status: 500 }
    )
  }
}
