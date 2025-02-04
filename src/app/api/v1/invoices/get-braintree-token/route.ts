export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'

import gateway from '@/lib/braintree'
import logger from '@/lib/logger'
import { authenticateRequest } from '@/services/auth-service/authenticate-api'
import { checkBraintreeCustomer } from '@/utils/backend-helper'

export async function PUT(req: NextRequest) {
  try {
    const user = await authenticateRequest(req)
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const selectedId = user?.internalTeamUserId || user?.userId
    let token = null

    const checkBraintreeCustomerExists = await checkBraintreeCustomer(
      selectedId
    )

    if (!checkBraintreeCustomerExists) {
      const response = await gateway.clientToken.generate({})
      token = response.clientToken
    } else {
      const response = await gateway.clientToken.generate({
        customerId: selectedId.toString(),
      })
      token = response.clientToken
    }

    logger.info(`generate braintree toke for for user ${selectedId}`)

    return NextResponse.json({
      success: true,
      token,
    })
  } catch (error) {
    logger.error(`Error generating add credits invoice`, error)
    return NextResponse.json(
      { message: 'Failed to generate add credit invoice' },
      { status: 500 }
    )
  }
}
