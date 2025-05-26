'use server'

import { unstable_cache } from 'next/cache'

import prisma from '@/lib/prisma'

interface QCData {
  id: number
  userId: number
  email: string
  name: string
  submittedHours: number
  filesCount: number
}

interface OrganizationDetails {
  id: number
  name: string
  userId: number
  userEmail: string
  userName: string
  qcs: QCData[]
}

const CACHE_TAG = 'organization-details'
const REVALIDATE_TIME = 60 * 5

export async function getOrganizationDetails(
  orgName: string,
  userId: number
): Promise<OrganizationDetails | null> {
  try {
    if (!orgName) {
      return null
    }

    return await unstable_cache(
      async () => {
        const organization = await prisma.organization.findFirst({
          where: {
            name: {
              equals: orgName,
              mode: 'insensitive',
            },
            userId: userId,
          },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstname: true,
                lastname: true,
              },
            },
          },
        })

        if (!organization) {
          return null
        }

        const qcs = await prisma.verifier.findMany({
          where: {
            enabledCustomers: {
              contains: orgName,
            },
          },
          include: {
            User: {
              select: {
                id: true,
                email: true,
                firstname: true,
                lastname: true,
              },
            },
          },
        })

        const qcDataPromises = qcs.map(async (qc) => {
          let userIds: number[] = []
          const teams = await prisma.team.findMany({
            where: { owner: userId },
            select: { id: true },
          })

          const teamIds = teams.map((team) => team.id)

          const teamUsers = await prisma.teamMember.findMany({
            where: {
              role: 'INTERNAL_TEAM_USER',
              teamId: { in: teamIds },
            },
            select: { userId: true },
          })

          const teamUserIds = teamUsers.map((user) => user.userId)

          userIds = Array.from(new Set([userId, ...teamUserIds]))

          const orders = await prisma.order.findMany({
            where: {
              userId: { in: userIds },
            },
            select: {
              id: true,
              fileId: true,
              File: {
                select: { duration: true },
              },
            },
          })

          const assignments = await prisma.jobAssignment.findMany({
            where: {
              user: { id: qc.userId },
              orderId: { in: orders.map((order) => order.id) },
              status: 'COMPLETED',
            },
          })

          let submittedHours = 0
          orders.forEach((order) => {
            const hasAssignment = assignments.some(
              (a) => a.orderId === order.id
            )
            if (hasAssignment && order.File?.duration) {
              submittedHours += order.File.duration / 3600
            }
          })

          return {
            id: qc.userId,
            userId: qc.userId,
            email: qc.User.email,
            name: `${qc.User.firstname} ${qc.User.lastname}`,
            submittedHours,
            filesCount: assignments.length,
          }
        })

        const qcData = await Promise.all(qcDataPromises)

        return {
          id: organization.id,
          name: organization.name,
          userId: organization.userId,
          userEmail: organization.user.email,
          userName: `${organization.user.firstname} ${organization.user.lastname}`,
          qcs: qcData,
        }
      },
      [`${CACHE_TAG}-${orgName}`],
      {
        revalidate: REVALIDATE_TIME,
        tags: [CACHE_TAG],
      }
    )()
  } catch (error) {
    console.error('Error fetching organization details:', error)
    throw new Error(`Failed to fetch details for organization: ${orgName}`)
  }
}
