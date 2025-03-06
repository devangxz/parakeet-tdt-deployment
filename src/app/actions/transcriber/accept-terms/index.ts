'use server'

import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import prisma from '@/lib/prisma'

export async function checkSignOffStatus() {
  const session = await getServerSession(authOptions)
  const user = session?.user
  const transcriberId = user?.userId

  if (!transcriberId) {
    return false
  }

  const verifier = await prisma.verifier.findUnique({
    where: { userId: transcriberId },
  })

  return verifier?.signOff ?? false
}

export async function updateSignOffStatus() {
  const session = await getServerSession(authOptions)
  const user = session?.user
  const transcriberId = user?.userId
  if (!transcriberId) {
    return {
      success: false,
      message: 'User not authenticated',
    }
  }

  await prisma.verifier.update({
    where: { userId: transcriberId },
    data: { signOff: true },
  })

  return true
}
