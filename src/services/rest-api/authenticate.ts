import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function authenticateApiKey(apiKey: string | null) {
  if (!apiKey) {
    return false
  }

  try {
    const decodedApiKey = Buffer.from(apiKey, 'base64').toString('ascii')
    apiKey = decodedApiKey.split(':')[0]

    const apiKeyRecord = await prisma.apiKey.findFirst({
      where: {
        OR: [{ apiKey }, { internalApiKey: apiKey }],
      },
      include: {
        user: {
          include: {
            Customer: true,
            UserRate: true,
            Organization: true,
          },
        },
      },
    })

    if (!apiKeyRecord) {
      logger.error(`Invalid API key: ${apiKey}`)
      return false
    }

    const user = apiKeyRecord.user

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
      internalTeamUserId:
        Number(user?.Customer?.lastSelectedInternalTeamUserId) || null,
      teamName: null,
      selectedUserTeamRole: null,
      orderType: user.UserRate?.orderType || 'TRANSCRIPTION',
      organizationName: user.Organization?.name || 'NONE',
      legalEnabled: false,
      reviewEnabled: false,
      generalFinalizerEnabled: false,
    }

    return payload
  } catch (error) {
    logger.error(`Error authenticating API key: ${error}`)
    return false
  }
}
