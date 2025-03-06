'use server'

import { endOfDay, format, startOfDay } from 'date-fns'
import { unstable_cache } from 'next/cache'

import prisma from '@/lib/prisma'
import { getTeamAdminUserDetails } from '@/utils/backend-helper'

interface CreditInfo {
  id: string
  customerEmail: string
  amount: number
  date: string
  type: string
  paidBy: string
}

interface GetCreditsError extends Error {
  code: 'DATE_INVALID' | 'INTERNAL_ERROR'
}

const CACHE_TAG = 'credits-info'
const REVALIDATE_TIME = 60 * 5

export async function getCreditsInfo(
  startDate: Date,
  endDate: Date
): Promise<CreditInfo[]> {
  try {
    if (!(startDate instanceof Date) || !(endDate instanceof Date)) {
      throw Object.assign(new Error('Invalid date format'), {
        code: 'DATE_INVALID',
      } as GetCreditsError)
    }

    const start = startOfDay(startDate)
    const end = endOfDay(endDate)

    return await unstable_cache(
      async () => {
        const credits = await prisma.invoice.findMany({
          where: {
            createdAt: {
              gte: start,
              lte: end,
            },
            type: {
              in: ['ADD_CREDITS', 'FREE_CREDITS'],
            },
            status: 'PAID',
          },
          include: {
            user: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        })

        const creditsInfo: CreditInfo[] = await Promise.all(
          credits.map(async (credit) => {
            let customerEmail = credit.user.email
            let paidBy = '-'
            if (credit.type === 'FREE_CREDITS') {
              if (credit.paidBy) {
                const userEmail = await prisma.user.findUnique({
                  where: {
                    id: credit.paidBy,
                  },
                })
                paidBy = userEmail?.email ?? '-'
              }
            }

            if (credit.user.role === 'INTERNAL_TEAM_USER') {
              const adminDetails = await getTeamAdminUserDetails(credit.user.id)
              customerEmail = adminDetails
                ? adminDetails.email
                : credit.user.email
            }

            return {
              id: credit.invoiceId.toString(),
              customerEmail,
              amount: credit.amount,
              date: format(credit.createdAt, 'yyyy-MM-dd'),
              type: credit.type,
              paidBy,
            }
          })
        )

        return creditsInfo
      },
      [
        `${CACHE_TAG}-${format(start, 'yyyy-MM-dd')}-${format(
          end,
          'yyyy-MM-dd'
        )}`,
      ],
      {
        revalidate: REVALIDATE_TIME,
        tags: [CACHE_TAG],
      }
    )()
  } catch (error) {
    console.error('Error in getCreditsInfo:', error)
    throw Object.assign(
      new Error(
        error instanceof Error ? error.message : 'Failed to fetch credits data'
      ),
      { code: 'INTERNAL_ERROR' } as GetCreditsError
    )
  }
}
