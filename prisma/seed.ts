'use server'

import { OrderType } from '@prisma/client'
import prisma from '../src/lib/prisma'

const legalOnboarding = async (
  email: string,
  userId: number,
  firstname: string
) => {
  await prisma.organization.create({
    data: {
      name: 'REMOTELEGAL',
      userId,
    },
  })

  await prisma.template.createMany({
    data: [
      {
        name: 'Deposition',
        userId,
      },
      {
        name: 'Hearing',
        userId,
      },
      {
        name: 'EUO',
        userId,
      },
      {
        name: 'Hearing (Trial)',
        userId,
      },
      {
        name: 'Hearing (Jury Trial)',
        userId,
      },
      {
        name: 'Hearing (Arbitration)',
        userId,
      },
      {
        name: 'Examination Before Trial',
        userId,
      },
      {
        name: 'Sworn Testimony',
        userId,
      },
      {
        name: 'Trial Testimony',
        userId,
      },
    ],
  })

  await prisma.userRate.create({
    data: {
      userId,
      manualRate: 10,
      svRate: 10,
      agreedMonthlyHours: 10,
      addChargeRate: 10,
      audioTimeCoding: 10,
      rushOrder: 10,
      customFormat: 10,
      customFormatOption: 'Legal',
      deadline: 10,
      customFormatQcRate: 10,
      orderType: OrderType.TRANSCRIPTION_FORMATTING,
    },
  })

  await prisma.customer.update({
    where: { userId },
    data: {
      customPlan: true,
    },
  })
}

async function createSeedUserAccount(user: {
  email: string
  pass: string
  salt: string
  firstname: string
  lastname: string
  role: string
  phone: string
  industry: string
  rc: string
  newsletter: boolean
  inviteKey: string
}) {
  try {
    const {
      email,
      pass,
      salt,
      firstname,
      lastname,
      role,
      phone,
      industry,
      rc,
      newsletter,
      inviteKey,
    } = user
    const newUser = await prisma.user.create({
      data: {
        email,
        pass,
        salt,
        firstname,
        lastname,
        role:
          role == 'CUSTOMER'
            ? 'CUSTOMER'
            : role === 'TRANSCRIBER'
            ? 'TRANSCRIBER'
            : 'REVIEWER',
        user: email,
        referralCode: 'q1w2e3r4t5y6',
        phoneNumber: phone,
        industry,
        status: 'VERIFIED',
      },
    })

    if (role == 'CUSTOMER') {
      await prisma.customer.create({
        data: {
          userId: newUser.id,
        },
      })

      await prisma.customerNotifyPrefs.create({
        data: {
          userId: newUser.id,
          newsletter: true,
        },
      })
    } else {
      await prisma.verifier.create({
        data: {
          userId: newUser.id,
          qcType: 'FREELANCER',
          legalEnabled: true,
          cfReviewEnabled: true,
        },
      })
      await prisma.transcriberNotifyPrefs.create({
        data: {
          userId: newUser.id,
          newsletter,
        },
      })
    }

    await prisma.invite.create({
      data: {
        email,
        inviteKey,
      },
    })

    if (industry.toLocaleLowerCase() === 'legal' && role === 'CUSTOMER') {
      await legalOnboarding(email, newUser.id, firstname)
    }
  } catch (error) {
    console.error('Error creating user:', error)
    throw error
  }
}

// B2C consumer account
createSeedUserAccount({
  email: 'demo@gmail.com',
  pass: '$2b$10$oRhLtaqmOGk..0wMoNUy6.6wyP6r44lvWph3jet6B14O/m/pqwRcK',
  salt: '$2b$10$oRhLtaqmOGk..0wMoNUy6.',
  firstname: 'demo',
  lastname: 'user',
  role: 'CUSTOMER',
  phone: '+918877665544',
  industry: 'Video',
  rc: '',
  newsletter: false,
  inviteKey: 'iv',
})
  .then((_) => console.log('dev b2c user created successfully'))
  .catch((err) => console.log(err))

// Test Transcriber User Account
createSeedUserAccount({
  email: 'test+transcriber+customer@scribie.com',
  pass: '$2b$10$oRhLtaqmOGk..0wMoNUy6.6wyP6r44lvWph3jet6B14O/m/pqwRcK',
  salt: '$2b$10$oRhLtaqmOGk..0wMoNUy6.',
  firstname: 'demo',
  lastname: 'user',
  role: 'CUSTOMER',
  phone: '+918877665544',
  industry: 'Video',
  rc: '',
  newsletter: false,
  inviteKey: 'iv',
})
  .then((_) => console.log('dev test transcriber user created successfully'))
  .catch((err) => console.log(err))

// // transcriber account
createSeedUserAccount({
  email: 'demo+tr@gmail.com',
  pass: '$2b$10$oRhLtaqmOGk..0wMoNUy6.6wyP6r44lvWph3jet6B14O/m/pqwRcK',
  salt: '$2b$10$oRhLtaqmOGk..0wMoNUy6.',
  firstname: 'demo+tr',
  lastname: 'user',
  role: 'TRANSCRIBER',
  phone: '+918877665544',
  industry: '',
  rc: '',
  newsletter: false,
  inviteKey: 'iv+tr',
})
  .then((_) => console.log('dev transcriber user created successfully'))
  .catch((err) => console.log(err))

// reviewer account
createSeedUserAccount({
  email: 'demo+rv@gmail.com',
  pass: '$2b$10$oRhLtaqmOGk..0wMoNUy6.6wyP6r44lvWph3jet6B14O/m/pqwRcK',
  salt: '$2b$10$oRhLtaqmOGk..0wMoNUy6.',
  firstname: 'demo+rv',
  lastname: 'user',
  role: 'REVIEWER',
  phone: '+918877665544',
  industry: '',
  rc: '',
  newsletter: false,
  inviteKey: 'iv+rv',
})
  .then((_) => console.log('dev reviewer user created successfully'))
  .catch((err) => console.log(err))

// reviewer account
createSeedUserAccount({
  email: 'demo+rl@gmail.com',
  pass: '$2b$10$oRhLtaqmOGk..0wMoNUy6.6wyP6r44lvWph3jet6B14O/m/pqwRcK',
  salt: '$2b$10$oRhLtaqmOGk..0wMoNUy6.',
  firstname: 'demo+rl',
  lastname: 'user',
  role: 'CUSTOMER',
  phone: '+918877665544',
  industry: 'Legal',
  rc: '',
  newsletter: false,
  inviteKey: 'iv+rl',
})
  .then((_) => console.log('dev rl user created successfully'))
  .catch((err) => console.log(err))
