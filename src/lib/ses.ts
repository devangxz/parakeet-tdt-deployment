import fs from 'fs'
import path from 'path'

import {
  SESClient,
  SendEmailCommand,
  SendTemplatedEmailCommand,
  CreateTemplateCommand,
  UpdateTemplateCommand,
  DeleteTemplateCommand,
} from '@aws-sdk/client-ses'

import logger from './logger'
import { EMAIL_TEMPLATES, EMAIL_IDS, EMAIL_PLACEHOLDERS } from '../constants'
import { getEmailDetails } from '../utils/backend-helper'

interface EmailDataInterface {
  userEmailId: string
}

type ConfigEmailsType = {
  FROM: string
  TO: string[]
  CC?: string[]
  BCC?: string[]
  SUBJECT: string
  HTML: string
  TEXT: string
}

// Create SES client
const createSESClient = () =>
  new SESClient({
    region: process.env.AWS_SES_REGION,
    credentials: {
      accessKeyId: process.env.AWS_SES_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SES_SECRET_ACCESS_KEY!,
    },
  })

// Main function to send mail
export async function sendMail(
  ses: SESClient,
  templateId: string,
  emailData: EmailDataInterface = { userEmailId: '' },
  templateData: { [key: string]: string } = {}
) {
  logger.info(`--> sendMail ${templateId}`)
  try {
    const emailDetails = {
      ...EMAIL_TEMPLATES[templateId as keyof typeof EMAIL_TEMPLATES],
    } as ConfigEmailsType
    const emailDetailsUpdated = updateEmailIds(emailDetails, emailData)

    if (!emailDetailsUpdated) {
      throw new Error(`Mail configuration not found for mailId: ${templateId}`)
    }

    if (emailDetailsUpdated.TEXT === '') {
      return sendMailHtml(ses, templateId, emailDetailsUpdated, templateData)
    } else {
      return sendMailText(ses, emailDetailsUpdated, templateData)
    }
  } catch (error) {
    logger.error(`Error sending email: ${(error as Error).message}`)
    throw error
  }
}

// Function to send alert
export async function sendAlert(
  ses: SESClient,
  subject: string,
  message: string,
  type = 'software'
) {
  logger.info(`--> sendAlert`)

  const templateId =
    type === 'software' ? 'ALERT_SW_MAIL' : 'ALERT_FUNCTION_MAIL'
  let emailDetails = EMAIL_TEMPLATES[templateId] as ConfigEmailsType

  const emailData: EmailDataInterface = { userEmailId: '' }
  emailDetails = updateEmailIds(emailDetails, emailData)

  if (!emailDetails) {
    throw new Error(`Error: Mail configuration not found for alert`)
  }

  try {
    const emailParams = {
      Source: emailDetails.FROM,
      Destination: {
        ToAddresses: emailDetails.TO,
        CcAddresses: emailDetails.CC || [],
        BccAddresses: emailDetails.BCC || [],
      },
      Message: {
        Body: {
          Text: {
            Data: message,
          },
        },
        Subject: {
          Data: `ALERT: ${subject}`,
        },
      },
    }

    const command = new SendEmailCommand(emailParams)
    const result = await ses.send(command)
    logger.info(`<-- sendAlert ${result.MessageId}`)
    return result
  } catch (error) {
    logger.error(`Error sending alert email: ${(error as Error).message}`)
    throw error
  }
}

// Function to send HTML mail
async function sendMailHtml(
  ses: SESClient,
  templateId: string,
  emailDetails: ConfigEmailsType,
  templateData: { [key: string]: string } = {}
) {
  logger.info(`--> sendMailHtml ${templateId}`)

  const templatesDir = path.join(process.cwd(), 'src', 'mail-templates')
  const templatePath = path.join(templatesDir, `${templateId}.html`)
  const templateContent = fs.readFileSync(templatePath, 'utf8')
  await updatePlaceHolders(templateContent, templateData)

  const emailParams = {
    Source: emailDetails.FROM,
    Destination: {
      ToAddresses: emailDetails.TO,
      CcAddresses: emailDetails.CC || [],
      BccAddresses: emailDetails.BCC || [],
    },
    Template: templateId,
    TemplateData: JSON.stringify(templateData),
  }

  try {
    const command = new SendTemplatedEmailCommand(emailParams)
    const result = await ses.send(command)
    logger.info(`<-- sendMailHtml ${result.MessageId}`)
    return result
  } catch (error) {
    logger.error(`Error sending HTML email: ${(error as Error).message}`)
    throw error
  }
}

// Function to send text mail
async function sendMailText(
  ses: SESClient,
  emailDetails: ConfigEmailsType,
  templateData: { [key: string]: string } = {}
) {
  logger.info(`--> sendMailText`)

  let emailContent = emailDetails.TEXT
  const placeholderKeys = await updatePlaceHolders(emailContent, templateData)

  placeholderKeys.forEach((key) => {
    const cleanKey = key
      .replace(/{{|\$\$|}}/g, '')
      .trim() as keyof typeof templateData
    if (templateData[cleanKey]) {
      emailContent = emailContent.replace(key, templateData[cleanKey])
    }
  })

  const emailParams = {
    Source: emailDetails.FROM,
    Destination: {
      ToAddresses: emailDetails.TO,
      CcAddresses: emailDetails.CC || [],
      BccAddresses: emailDetails.BCC || [],
    },
    Message: {
      Body: {
        Text: {
          Data: emailContent,
        },
      },
      Subject: {
        Data: emailDetails.SUBJECT,
      },
    },
  }

  try {
    const command = new SendEmailCommand(emailParams)
    const result = await ses.send(command)
    logger.info(`<-- sendMailText ${result.MessageId}`)
    return result
  } catch (error) {
    logger.error(`Error sending text email: ${(error as Error).message}`)
    throw error
  }
}

// Function to create email template
export async function createTemplate(
  ses: SESClient,
  templateId: string
): Promise<string> {
  logger.info(`--> createTemplate ${templateId}`)

  const templatesDir = path.join(process.cwd(), 'src', 'mail-templates')
  const templatePath = path.join(templatesDir, `${templateId}.html`)
  const htmlContent = fs.readFileSync(templatePath, 'utf8')
  const strippedHtmlContent = htmlContent.replace(/<[^>]*>?/gm, '')

  const emailDetails = EMAIL_TEMPLATES[
    templateId as keyof typeof EMAIL_TEMPLATES
  ] as ConfigEmailsType
  if (!emailDetails) {
    throw new Error(`Mail configuration not found for template: ${templateId}`)
  }

  const params = {
    Template: {
      TemplateName: templateId,
      SubjectPart: emailDetails.SUBJECT,
      HtmlPart: htmlContent,
      TextPart: strippedHtmlContent,
    },
  }

  try {
    const command = new CreateTemplateCommand(params)
    await ses.send(command)
    logger.info(`<-- createTemplate ${templateId}`)
    return `Email Template ${templateId} was created successfully`
  } catch (error) {
    const errMessage = `Error creating email template: ${templateId}: ${(
      error as Error
    ).toString()}`
    logger.error(errMessage)
    return errMessage
  }
}

// Function to update email template
export async function updateTemplate(
  ses: SESClient,
  templateId: string
): Promise<string> {
  logger.info(`--> updateTemplate ${templateId}`)

  const templatesDir = path.join(process.cwd(), 'src', 'mail-templates')
  const templatePath = path.join(templatesDir, `${templateId}.html`)
  const htmlContent = fs.readFileSync(templatePath, 'utf8')
  const strippedHtmlContent = htmlContent.replace(/<[^>]*>?/gm, '')

  const emailDetails = EMAIL_TEMPLATES[
    templateId as keyof typeof EMAIL_TEMPLATES
  ] as ConfigEmailsType
  if (!emailDetails) {
    throw new Error(`Mail configuration not found for template: ${templateId}`)
  }

  const params = {
    Template: {
      TemplateName: templateId,
      SubjectPart: emailDetails.SUBJECT,
      HtmlPart: htmlContent,
      TextPart: strippedHtmlContent,
    },
  }

  try {
    const command = new UpdateTemplateCommand(params)
    await ses.send(command)
    logger.info(`<-- updateTemplate ${templateId}`)
    return `Email Template ${templateId} was updated successfully`
  } catch (error) {
    const errMessage = `Error updating email template: ${templateId}: ${(
      error as Error
    ).toString()}`
    logger.error(errMessage)
    return errMessage
  }
}

// Function to delete email template
export async function deleteTemplate(
  ses: SESClient,
  templateId: string
): Promise<string> {
  logger.info(`--> deleteTemplate ${templateId}`)
  const params = {
    TemplateName: templateId,
  }

  try {
    const command = new DeleteTemplateCommand(params)
    await ses.send(command)
    logger.info(`<-- deleteTemplate ${templateId}`)
    return `Email Template ${templateId} was deleted successfully`
  } catch (error) {
    const errMessage = `Error deleting email template: ${templateId}: ${(
      error as Error
    ).toString()}`
    logger.error(errMessage)
    return errMessage
  }
}

// Helper function to update email IDs
function updateEmailIds(
  mailConfig: ConfigEmailsType,
  emailData: EmailDataInterface
): ConfigEmailsType {
  logger.info(`--> updateEmailIds ${JSON.stringify(emailData)}`)

  const updatedConfig = { ...mailConfig }

  if (updatedConfig.FROM in EMAIL_IDS) {
    updatedConfig.FROM = EMAIL_IDS[updatedConfig.FROM as keyof typeof EMAIL_IDS]
  }

  updatedConfig.TO = updatedConfig.TO.map((email: string) => {
    if (email === '$$USER_EMAIL_ID$$' && emailData.userEmailId) {
      return emailData.userEmailId
    }
    return email in EMAIL_IDS
      ? EMAIL_IDS[email as keyof typeof EMAIL_IDS]
      : email
  })

  if (updatedConfig.CC) {
    updatedConfig.CC = updatedConfig.CC.map((email: string) =>
      email in EMAIL_IDS ? EMAIL_IDS[email as keyof typeof EMAIL_IDS] : email
    )
  }

  if (updatedConfig.BCC) {
    updatedConfig.BCC = updatedConfig.BCC.map((email: string) =>
      email in EMAIL_IDS ? EMAIL_IDS[email as keyof typeof EMAIL_IDS] : email
    )
  }

  logger.info('<-- updateEmailIds')
  return updatedConfig
}

// Helper function to update placeholders
async function updatePlaceHolders(
  content: string,
  templateData: { [key: string]: string }
): Promise<string[]> {
  logger.info(`--> updatePlaceHolders ${JSON.stringify(templateData, null, 2)}`)
  const placeholderKeys = content.match(/{{\$\$[\w\.]+\$\$}}/g) || []
  placeholderKeys.forEach((key) => {
    let cleanKey = key.replace(/{{|\$\$|}}/g, '').trim()
    cleanKey = `\$\$${cleanKey}\$\$` as string

    if (
      templateData[cleanKey] === undefined &&
      cleanKey in EMAIL_PLACEHOLDERS
    ) {
      templateData[cleanKey] =
        EMAIL_PLACEHOLDERS[cleanKey as keyof typeof EMAIL_PLACEHOLDERS]
    }
  })
  logger.info(`<-- updatePlaceHolders ${JSON.stringify(templateData, null, 2)}`)
  return placeholderKeys
}

export async function sendTemplateMail(
  templateId: string,
  userId: number,
  templateData: { [key: string]: string } = {},
  paidBy?: number
) {
  try {
    const getEmails = await getEmailDetails(userId, paidBy ?? 0)
    if (!getEmails) {
      logger.error(`Emails not found for user ${userId}`)
      return
    }
    const emailData: EmailDataInterface = {
      userEmailId: getEmails?.email || '',
    }
    const ses = createSESClient()
    await sendMail(ses, templateId, emailData, templateData)
  } catch (error) {
    logger.error(`Error in sendTemplateMail: ${(error as Error).message}`)
    return
  }
}

export function getAWSSesInstance() {
  logger.info('getAWSSesInstance: Using real AWS SES')
  const ses = createSESClient()
  return {
    sendMail: (
      templateId: string,
      emailData: EmailDataInterface,
      templateData: { [key: string]: string }
    ) => sendMail(ses, templateId, emailData, templateData),
    sendAlert: (subject: string, message: string, type: string) =>
      sendAlert(ses, subject, message, type),
    createTemplate: (templateId: string) => createTemplate(ses, templateId),
    updateTemplate: (templateId: string) => updateTemplate(ses, templateId),
    deleteTemplate: (templateId: string) => deleteTemplate(ses, templateId),
  }
}
