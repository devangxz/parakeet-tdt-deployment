'use server'

import { unstable_cache } from 'next/cache'

import prisma from '@/lib/prisma'

interface Organization {
  id: number
  name: string
  userId: number
  user: {
    email: string
  }
}

const CACHE_TAG = 'organizations'
const REVALIDATE_TIME = 60 * 5

export async function getOrganizations(): Promise<Organization[]> {
  try {
    return await unstable_cache(
      async () => {
        const organizations = await prisma.organization.findMany({
          select: {
            id: true,
            name: true,
            userId: true,
            user: {
              select: {
                email: true,
              },
            },
          },
          orderBy: {
            name: 'asc',
          },
        })

        return organizations
      },
      [`${CACHE_TAG}-list`],
      {
        revalidate: REVALIDATE_TIME,
        tags: [CACHE_TAG],
      }
    )()
  } catch (error) {
    throw new Error('Failed to fetch organizations')
  }
}
