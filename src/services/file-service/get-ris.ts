import path from 'path'

import mammoth from 'mammoth'
import OpenAI from 'openai'
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions'

import config from '../../../config.json'
import logger from '@/lib/logger'
import { getAWSSesInstance } from '@/lib/ses'
import { downloadFromS3 } from '@/utils/backend-helper'

function getTemplateName(templateType: string): string {
  return `${templateType}.docx`
}

async function getRISText(fileName: string) {
  const risText = await downloadFromS3(fileName)
  const { value: risValue } = await mammoth.extractRawText({
    buffer: Buffer.from(risText),
  })
  logger.info(`\n\n risValue ${risValue.substring(0, 100)}`)
  return risValue
}

async function getTemplateData(fileName: string, organizationName: string) {
  const templateFilePath = path.join(
    process.cwd(),
    'docxTemplates',
    organizationName,
    fileName
  )
  logger.info(`templateFilePath: ${templateFilePath}`)

  const { value: templateValue } = await mammoth.extractRawText({
    path: templateFilePath,
  })

  logger.info(`\n\n templateValue ${templateValue.substring(0, 100)}`)
  return templateValue
}

function validateRISJson(risData: { [key: string]: string }): string[] {
  logger.info('--> validateRISJson')

  let inconsistencies: string[] = []

  // 1. Check for required/mandatory keys
  const requiredKeys = [
    'case_no',
    'job_number',
    'jurisdiction_1',
    'jurisdiction_2',
    'proceeding_type',
    'videoconference_platform',

    'weekday',
    'day',
    'month',
    'year',
    'start_time',
    'end_time',

    //'defendant_', // TODO: There should be atleast 1
    //'plaintiff_', // TODO: There should be atleast 1
    'witness_name',
    'reporter_name',
  ]

  for (const key of requiredKeys) {
    if (
      !(key in risData) ||
      typeof risData[key] !== 'string' ||
      risData[key].trim() === ''
    ) {
      const error = `Invalid or missing ${key} in RIS data`
      logger.error(error)
      inconsistencies = inconsistencies.concat(error)
    }
  }

  function getSortedKeys(
    keyPrefix: string,
    risData: { [key: string]: string }
  ): string[] {
    const pdKeys = Object.keys(risData).filter((key) =>
      new RegExp(`^${keyPrefix}`).test(key)
    )
    pdKeys.sort((a, b) => {
      const numA = parseInt(a.split('_').pop() ?? '0')
      const numB = parseInt(b.split('_').pop() ?? '0')
      return numA - numB
    })
    logger.info(`<-- ${keyPrefix} pdKeys: ${JSON.stringify(pdKeys)}`)
    return pdKeys
  }

  // 2. Validate the order of key - _2 should not come without _1 and
  const validatePartyOrder = (partyKeys: string[]) => {
    logger.info(`validatePartyOrder keys: ${JSON.stringify(partyKeys)}`)

    for (let i = 0; i < partyKeys.length; i++) {
      const expectedNumber = i + 1
      const actualNumber = partyKeys[i].split('_').pop()
      const remainingString = partyKeys[i].split('_').slice(0, -1).join('_')
      if (parseInt(actualNumber ?? '') !== expectedNumber) {
        const error = `Invalid key: expected ${remainingString}_${expectedNumber}, got ${partyKeys[i]}`
        logger.error(error)
        inconsistencies = inconsistencies.concat(error)
      }
    }
    return true
  }

  const processPdKeys = (pdPrefix: string) => {
    const pdKeys = getSortedKeys(`${pdPrefix}\\d+$`, risData)
    logger.info(`pdKeys ${pdKeys}`)
    validatePartyOrder(pdKeys)
  }

  processPdKeys(`plaintiff_`)
  processPdKeys(`defendant_`)

  const result = inconsistencies.length > 0 ? 'Not Valid' : 'Valid'
  logger.info(`<-- validateRISJson: ${result}`)
  return inconsistencies
}

async function makeLLMCall(systemPrompt: string, userPrompt: string) {
  try{
    const messages: ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: userPrompt,
      },
    ]
    
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    
    const seed: number = 1
    const temp: number = 0
    const completion = await openai.chat.completions.create({
      messages,
      model: config.llm,
      temperature: temp,
      seed,
    })
    
    return completion.choices[0].message.content ?? ''
  }
  catch(error){
    logger.error(`<-- makeLLMCall ${error instanceof Error ? error.message : String(error)}`)
    return ''
  }
}

export default async function extractDataFromRISFile(
  fileId: string,
  templateType: string,
  organizationName: string
) {
  logger.info(`--> extractDataFromRISFile ${fileId}`)
  try {
    const risFile = `${fileId}_ris.docx`
    const risText = await getRISText(risFile)
    const template = getTemplateName(templateType)
    const templateText = await getTemplateData(template, organizationName)
    logger.info(`templateText: ${templateText.length}, risText: ${risText.length}`)
    
    // Call LLM
    // TODO: Update prompt to return the output in json format. Move the prompt to a json file

    const system_content = `You are a highly skilled AI tasked with processing the text from two docx files. Please analyze the text and return the extracted information in JSON format. The extracted information needs to be variables that are enclosed in {} flower braces and give me the pure JSON output of those variables from both docx. Fill in the values of those variables from another docx I have given to you. Make sure you get all the variables. Do not add any additional text of your own. Here are some things you need to remember for formatting the values: Date needs to be in this format - "<weekday>, 23rd September, 2023" and not in "23/09/2023". I dont want / in my date so I want my Date to be like this - "<weekday> 23rd September, 2023". Please make sure you return the date only in this form. in the notary_name key, get the name and the CDR/CER number with the name. for example if this is the value for the reporter name : "KIMBERLY RAWLS, CDR-1944". You need to get teh name "KIMBERLY RAWLS" and the CDR-1944 number as well. so the full value for the key becomes "KIMBERLY RAWLS, CDR-1944". Please remove rawxml as a key in the json output. Please fill in the Day and the month and year form the Date itself. Day would be like this - 23rd or 4th or 27th and then the month and year would be - September, 2023. Please fill in the details accordingly. If there is a long address, split the address into twi address of the same person and use a comma as an escape sequence to determine the split. There are many scenarios where there are several other plaintiffs, defendants, addresses, dates, etc. Please make sure you handle all of them and name them appropriately. Please make sure you return the output in JSON format. This is how the json should look like:
            {
                jurisdiction_1: <some_text_here>,
                jurisdiction_2: <some_text_here>,
                plaintiff_1: <some_text_here>,
                plaintiff_2: <some_text_here>,
                defendant_1: <some_text_here>,
                defendant_2: <some_text_here>
            }
            
            The values in the json should always be of type string.`
    const user_content = `DOCX1 content: ${templateText}\nDOCX2 content: ${risText}`
    const risData = await makeLLMCall(system_content, user_content)

    // Get the string starting from { to }. The LLM output is as follows
    // ``json\n{\n    \"jurisdiction_1\": \"SUPREME COURT O
    // :
    // :
    //  \n    \"comm_no\": \"\",\n    \"comm_exp\": \"\"\n}\n```"
    const jsonRegex = /\{[\s\S]*\}/
    const trimmedRisData = risData?.match(jsonRegex)?.[0]
    logger.info(
      `Trimmed RIS Data for file ${fileId}: ${trimmedRisData?.slice(0, 100)}`
    )
    if (!trimmedRisData) {
      logger.error(
        `extractDataFromRISFile: No JSON object found in the input string for file ${fileId}`
      )
    }

    let risDataJson = {}
    if (trimmedRisData) {
      risDataJson = JSON.parse(trimmedRisData)
    }
    const result = validateRISJson(risDataJson)
    logger.info(`Validation result for file ${fileId}: ${result}`)
    if (result.length > 0) {
      logger.error(
        `Validation failed with the following inconsistencies for file ${fileId}: ${result.join(
          ', '
        )}`
      )
      const awsSes = getAWSSesInstance()
      await awsSes.sendAlert(
        `Validation failed for the extracted RIS data`,
        `Validation failed for the extracted RIS data for the file ${fileId} with the following inconsistencies ${result.join(
          ', '
        )}`,
        'software'
      )
    }

    logger.info(
      `<-- extractDataFromRISFile ${fileId} ${JSON.stringify(risDataJson)}`
    )
    return risDataJson
  } catch (error) {
    logger.error(`<-- extractDataFromRISFile ${error} for file ${fileId}`)
    throw new Error(error instanceof Error ? error.message : String(error))
  }
}
