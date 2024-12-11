export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import {
  getCustomPlanDetails,
  updateCustomPlan,
} from '@/services/admin/custom-plan-service'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const userEmail = searchParams.get('email') ?? ''
    const response = await getCustomPlanDetails({ userEmail })
    return NextResponse.json(response)
  } catch (error) {
    logger.error(`Error while fetching custom plan details`, error)
    return NextResponse.json({
      success: false,
      s: 'An error occurred. Please try again after some time.',
    })
  }
}

export async function POST(req: Request) {
  try {
    const { userEmail, rates } = await req.json()
    const response = await updateCustomPlan({ userEmail, rates })
    return NextResponse.json(response)
  } catch (error) {
    logger.error(`Error while updating custom plan`, error)
    return NextResponse.json({
      success: false,
      s: 'An error occurred. Please try again after some time.',
    })
  }
}
