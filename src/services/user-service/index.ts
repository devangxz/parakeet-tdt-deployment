import { User, QCType } from '@prisma/client'
import bcrypt from 'bcrypt'

import { AFFILIATE_RATE } from '@/constants'
import prisma from '@/lib/prisma'
import { getAWSSesInstance } from '@/lib/ses'
import { generateUniqueId } from '@/utils/generateUniqueId'
import isValidEmail from '@/utils/isValidEmail'

interface CreateUserData {
  email: string
  password: string
  firstname: string
  lastname: string
  role: string
  phone: string
  industry: string
  rc: string
  newsletter: boolean
}

// const legalOnboarding = async (
//   email: string,
//   userId: number,
//   firstname: string
// ) => {
//   await prisma.organization.create({
//     data: {
//       name: firstname,
//       userId,
//     },
//   })

//   await prisma.template.createMany({
//     data: [
//       {
//         name: 'Deposition',
//         userId,
//       },
//       {
//         name: 'Hearing',
//         userId,
//       },
//       {
//         name: 'EUO',
//         userId,
//       },
//       {
//         name: 'Hearing (Trial)',
//         userId,
//       },
//       {
//         name: 'Hearing (Jury Trial)',
//         userId,
//       },
//       {
//         name: 'Hearing (Arbitration)',
//         userId,
//       },
//       {
//         name: 'Examination Before Trial',
//         userId,
//       },
//       {
//         name: 'Sworn Testimony',
//         userId,
//       },
//       {
//         name: 'Trial Testimony',
//         userId,
//       },
//     ],
//   })

//   await prisma.userRate.create({
//     data: {
//       userId,
//       manualRate: 0.8,
//       svRate: 0,
//       agreedMonthlyHours: 20,
//       addChargeRate: 0.5,
//       audioTimeCoding: 0,
//       rushOrder: 1,
//       customFormat: 0.5,
//       customFormatOption: 'Legal',
//       deadline: 5,
//       customFormatQcRate: 0.1,
//       orderType: OrderType.TRANSCRIPTION_FORMATTING,
//     },
//   })

//   await prisma.customer.update({
//     where: { userId },
//     data: {
//       customPlan: true,
//     },
//   })
// }

export async function createUser(
  userData: CreateUserData
): Promise<{ success: boolean; message: string; user?: User }> {
  const {
    email,
    password,
    firstname,
    lastname,
    role,
    phone,
    industry,
    rc,
    newsletter,
  } = userData
  try {
    const referralCode = generateUniqueId()
    const inviteKey = generateUniqueId()

    if (!isValidEmail(email)) {
      return {
        success: false,
        message: 'Invalid email format',
      }
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return { success: false, message: 'User with this email already exists' }
    }

    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    let referralUser = null
    if (rc) {
      referralUser = await prisma.user.findFirst({
        where: { referralCode: rc as string },
        select: { email: true },
      })
    }

    const newUser = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        pass: hashedPassword,
        salt,
        firstname,
        lastname,
        role: role === 'customer' ? 'CUSTOMER' : 'TRANSCRIBER',
        user: email,
        referralCode,
        phoneNumber: phone,
        industry,
        ...(referralUser && {
          referredBy: referralUser.email,
          referralRate: AFFILIATE_RATE,
        }),
      },
    })

    if (role === 'customer') {
      await prisma.customer.create({
        data: {
          userId: newUser.id,
        },
      })

      await prisma.customerNotifyPrefs.create({
        data: {
          userId: newUser.id,
          newsletter,
        },
      })
    } else {
      await prisma.verifier.create({
        data: {
          userId: newUser.id,
          qcType: QCType.FREELANCER,
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

    // if (industry.toLocaleLowerCase() === 'legal' && role === 'customer') {
    //   await legalOnboarding(email, newUser.id, firstname)
    // }

    const emailData = {
      userEmailId: email,
    }

    const templateData = {
      first_name: firstname,
      url: `https://${process.env.SERVER}/verify-account/${inviteKey}`,
    }

    const ses = getAWSSesInstance()

    await ses.sendMail('ACCOUNT_VERIFY', emailData, templateData)

    return {
      success: true,
      message: 'User created successfully',
      user: newUser,
    }
  } catch (error) {
    console.error('Error creating user:', error)
    return { success: false, message: 'Failed to create user' }
  }
}
