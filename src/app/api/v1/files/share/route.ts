import { SharedFilePermission } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { getAWSSesInstance } from '@/lib/ses'
import { authenticateRequest } from '@/services/auth-service/authenticate-api'

function generateRandomString(length: number) {
  const characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length))
  }
  return result
}

export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { files, allUsers, message } = await request.json()

    if (!files || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Files array is required' },
        { status: 400 }
      )
    }

    if (!allUsers || !Array.isArray(allUsers) || allUsers.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Users array is required' },
        { status: 400 }
      )
    }

    const existingUsers = await prisma.user.findMany({
      where: { email: { in: allUsers.map((u) => u.email) } },
      select: { id: true, email: true, firstname: true, lastname: true },
    })

    const newUserEmails = allUsers
      .filter((u) => !existingUsers.some((eu) => eu.email === u.email))
      .map((u) => u.email)

    if (newUserEmails.length > 0) {
      await prisma.$transaction(async (tx) => {
        await tx.user.createMany({
          data: newUserEmails.map((email) => ({ email })),
        })

        const newUsers = await tx.user.findMany({
          where: { email: { in: newUserEmails } },
          select: { id: true, email: true, firstname: true, lastname: true },
        })

        await tx.invite.createMany({
          data: newUsers.map((u) => ({
            email: u.email,
            inviteKey: generateRandomString(16),
          })),
        })

        existingUsers.push(...newUsers)
      })
    }

    await prisma.sharedFile.deleteMany({
      where: {
        fileId: { in: files },
        toUserId: { in: existingUsers.map((u) => u.id) },
        fromUserId: user.userId,
      },
    })

    const sharedFilesData = files.flatMap((fileId) =>
      existingUsers
        .filter(
          (u) =>
            allUsers.find((au) => au.email === u.email)?.permission !== 'REMOVE'
        )
        .map((u) => ({
          fileId,
          fromUserId: user.userId,
          toUserId: u.id,
          permission:
            allUsers.find((au) => au.email === u.email)?.permission ?? 'VIEWER',
        }))
    )

    await prisma.sharedFile.createMany({
      data: sharedFilesData.map((data) => ({
        ...data,
        permission: data.permission as SharedFilePermission,
      })),
    })

    await sendEmails(existingUsers, user, message, newUserEmails)

    logger.info(`Successfully shared files for user ${user.email}`)

    return NextResponse.json({
      success: true,
      message: 'Successfully shared the files',
    })
  } catch (error) {
    logger.error(`Error sharing files: ${error}`)
    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred. Please try again later.',
      },
      { status: 500 }
    )
  }
}

async function sendEmails(
  users: {
    id: number
    email: string
    firstname: string | null
    lastname: string | null
  }[],
  fromUser: {
    userId: number
    email: string
    name: string
  },
  message: string,
  newUserEmails: string[]
) {
  const invites =
    newUserEmails.length > 0
      ? await prisma.invite.findMany({
          where: { email: { in: newUserEmails } },
          select: { email: true, inviteKey: true },
        })
      : []

  const ses = getAWSSesInstance()

  for (const user of users) {
    const invite = invites.find((i) => i.email === user.email)
    const emailContent = invite
      ? getNewUserEmailContent(fromUser, invite.inviteKey)
      : getExistingUserEmailContent(fromUser, message)
    await ses.sendMail(
      'FILE_SHARED',
      { userEmailId: user.email },
      { emailContent }
    )
  }
}

function getNewUserEmailContent(
  fromUser: {
    userId: number
    email: string
    name: string
  },
  inviteKey: string
): string {
  const url = `https://${process.env.SERVER}/create/${inviteKey}`
  const sharedUrl = `https://${process.env.SERVER}/files/shared`

  return `
    Hello,<br /><br />
    <b>${fromUser?.name} (${fromUser?.email})</b> has shared a file on <a href='https://${process.env.SERVER}'>Scribie</a>.<br /><br />
    To access the file, please visit the following link to create your account with us:<br /><br />
    <a href='${url}'>${url}</a><br /><br />
    After creating your account, please visit the 'Shared with me' folder to view the shared file:<br />
    <a href='${sharedUrl}'>${sharedUrl}</a><br /><br />
    Best regards,<br />
    Scribie Support
  `
}

function getExistingUserEmailContent(
  fromUser: {
    userId: number
    email: string
    name: string
  },
  message: string
): string {
  const url = `https://${process.env.SERVER}/files/shared`

  return `
    Hello,<br /><br />
    <b>${fromUser?.name} (${
    fromUser?.email
  })</b> has shared a file on <a href='https://${
    process.env.SERVER
  }'>Scribie</a>.<br /><br />
    ${message ? `${message}<br /><br />` : ''}
    Please visit the 'Shared with me' folder to view the shared file:<br /><br />
    <a href='${url}'>${url}</a><br /><br />
    Best regards,<br />
    Scribie Support
  `
}
