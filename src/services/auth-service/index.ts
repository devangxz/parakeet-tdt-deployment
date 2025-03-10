import bcrypt from 'bcrypt'

import { signJwtAccessToken } from '@/lib/jwt'
import prisma from '@/lib/prisma'

interface PropsData {
  email: string
  password: string
}

export async function signInUser(userData: PropsData) {
  const { email, password } = userData
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        Customer: true,
        UserRate: true,
        Organization: true,
        Verifier: true,
      },
    })

    if (!user || !bcrypt.compareSync(password, user.pass as string)) {
      return {
        success: false,
        message: 'Invalid email or password',
      }
    }

    if (user.status === 'SUSPENDED') {
      return {
        success: false,
        message: 'Account suspended',
      }
    }
    const lastSelectedInternalTeamUserId =
      user?.Customer?.lastSelectedInternalTeamUserId

    if (lastSelectedInternalTeamUserId) {
      const teamExists = await prisma.teamMember.findFirst({
        where: {
          userId: parseInt(lastSelectedInternalTeamUserId),
        },
        include: {
          team: true,
        },
      })

      if (!teamExists) {
        console.error(`Team not found ${lastSelectedInternalTeamUserId}`)
        return { success: false, message: 'Team not found' }
      }

      const userTeamRole = await prisma.teamMember.findFirst({
        where: {
          userId: user.id,
          teamId: teamExists.teamId,
        },
      })
      const adminTeamMember = await prisma.teamMember.findFirst({
        where: {
          teamId: teamExists.teamId,
          role: 'SUPER_ADMIN',
        },
        include: {
          user: {
            include: {
              UserRate: true,
              Customer: true,
              Organization: true,
            },
          },
        },
      })
      const payload = {
        name: `${user.firstname} ${user.lastname}`,
        user: user.user,
        userId: user.id,
        email: user.email,
        role: user.role,
        referralCode: user.referralCode,
        status: user.status,
        proAccount: user?.Customer?.proAccount || 0,
        customPlan: adminTeamMember?.user?.Customer?.customPlan || false,
        internalTeamUserId: parseInt(lastSelectedInternalTeamUserId),
        teamName: teamExists.team.name,
        selectedUserTeamRole: userTeamRole?.role,
        orderType: adminTeamMember?.user.UserRate?.orderType || 'TRANSCRIPTION',
        organizationName: adminTeamMember?.user.Organization?.name || 'NONE',
        legalEnabled: user?.Verifier?.legalEnabled || false,
        reviewEnabled: user?.Verifier?.cfReviewEnabled || false,
        generalFinalizerEnabled:
          user?.Verifier?.generalFinalizerEnabled || false,
      }

      const token = signJwtAccessToken(payload)

      return {
        success: true,
        message: 'User signed in successfully',
        user: payload,
        token,
      }
    } else {
      const payload = {
        name: `${user.firstname} ${user.lastname}`,
        user: user.user,
        userId: user.id,
        email: user.email,
        role: user.role,
        referralCode: user.referralCode,
        status: user.status,
        proAccount: user?.Customer?.proAccount || 0,
        customPlan: user?.Customer?.customPlan || false,
        internalTeamUserId: null,
        teamName: null,
        selectedUserTeamRole: null,
        orderType: user.UserRate?.orderType || 'TRANSCRIPTION',
        organizationName: user.Organization?.name || 'NONE',
        legalEnabled: user?.Verifier?.legalEnabled || false,
        reviewEnabled: user?.Verifier?.cfReviewEnabled || false,
        generalFinalizerEnabled:
          user?.Verifier?.generalFinalizerEnabled || false,
      }

      const token = signJwtAccessToken(payload)

      await prisma.user.update({
        where: { id: user.id },
        data: {
          lastAccess: new Date(),
        },
      })

      return {
        success: true,
        message: 'User signed in successfully',
        user: payload,
        token,
      }
    }
  } catch (error) {
    console.error('Error during sign in:', error)
    return { success: false, message: 'Error during sign in' }
  }
}
