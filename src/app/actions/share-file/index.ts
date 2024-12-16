'use server'

import { SharedFilePermission } from '@prisma/client'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { getAWSSesInstance } from '@/lib/ses'

const generateRandomString = (length: number) => {
  const characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length))
  }
  return result
}

export async function shareFiles(
  files: string[],
  allUsers: { email: string; permission?: string }[],
  message: string
) {
  const session = await getServerSession(authOptions)
  const user = session?.user

  if (!user) {
    logger.error('User not authenticated')
    return {
      success: false,
      error: 'User not authenticated',
    }
  }

  try {
    const existingUsers = await prisma.user.findMany({
      where: { email: { in: allUsers.map((u: { email: string }) => u.email) } },
      select: { id: true, email: true, firstname: true, lastname: true },
    })

    const newUserEmails = allUsers
      .filter(
        (u: { email: string }) =>
          !existingUsers.some((eu) => eu.email === u.email)
      )
      .map((u: { email: string }) => u.email)

    if (newUserEmails.length > 0) {
      await prisma.$transaction(async (tx) => {
        await tx.user.createMany({
          data: newUserEmails.map((email: string) => ({ email })),
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

    const sharedFilesData = files.flatMap((fileId: string) =>
      existingUsers
        .filter(
          (u) =>
            allUsers.find((au: { email: string }) => au.email === u.email)
              ?.permission !== 'REMOVE'
        )
        .map((u) => ({
          fileId,
          fromUserId: user.userId,
          toUserId: u.id,
          permission:
            allUsers.find((au: { email: string }) => au.email === u.email)
              ?.permission ?? 'VIEWER',
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

    return {
      success: true,
      message: 'Successfully shared the files',
    }
  } catch (error) {
    logger.error(`Error sharing files for ${user.email}: ${error}`)
    return {
      success: false,
      error: 'An error occurred. Please try again later.',
    }
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
    <b>${fromUser?.name} (${fromUser?.email})</b> has shared a file on <a href='https://${process.env.SERVER}'>Scribie.ai</a>.<br /><br />
    To access the file, please visit the following link to create your account with us:<br /><br />
    <a href='${url}'>${url}</a><br /><br />
    After creating your account, please visit the 'Shared with me' folder to view the shared file:<br />
    <a href='${sharedUrl}'>${sharedUrl}</a><br /><br />
    Best regards,<br />
    Scribie.ai Support
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
  }'>Scribie.ai</a>.<br /><br />
    ${message ? `${message}<br /><br />` : ''}
    Please visit the 'Shared with me' folder to view the shared file:<br /><br />
    <a href='${url}'>${url}</a><br /><br />
    Best regards,<br />
    Scribie.ai Support
  `
}
