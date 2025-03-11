'use server'

import { OpenAI } from "openai";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions.mjs";
import { createHeaders, PORTKEY_GATEWAY_URL } from "portkey-ai";

import config from '../../../../../config.json'
import logger from "@/lib/logger";
import prisma from "@/lib/prisma";
import { withRetry } from "@/lib/retry";
import { systemPrompt, userPrompt } from "@/utils/processWithLLMUtils";

interface ProcessWithLLMStats {
  userId: number;
  fileId: string;
  instructions: string;
  llmTimeTaken: number;
  savedTime: Date;
}

async function makeLLMCall(
    transcriptPart: string,
    systemPrompt: string,
    userPrompt: string,
    instructions: string
) {
  try{

    if (transcriptPart !== '') {
      userPrompt = userPrompt.replace('{transcriptPart}', transcriptPart);
    }
    if (instructions !== '') {
      userPrompt = userPrompt.replace('{instructions}', instructions);
    }
    
    const messages: ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: userPrompt,
      },
    ];
    
    const startTime = Date.now();    
    const openai = new OpenAI({ 
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: PORTKEY_GATEWAY_URL,
      defaultHeaders: createHeaders({
        provider: 'openai',
        apiKey: process.env.PORTKEY_API_KEY
      })
    });
    
    const seed: number = 1;
    const temp: number = 0;
    const completion = await openai.chat.completions.create({
      messages,
      model: config.llm,
      temperature: temp,
      seed,
    });
    const endTime = Date.now();
    const timeTaken = endTime - startTime;
    
    return {
      completion,
      timeTaken,
    };
  }
  catch(error){
    logger.error(`Error while making a call to LLM ${error}`);
    throw error;
  }
}

export const markTranscriptWithLLMServerAction = async(transcript: string, fileId: string, 
currentPart: number, 
totalParts: number,
instructions: string
) => {
  try{
    const result = await withRetry(async () => {
    logger.info(`Marking transcript part: ${currentPart+1} of ${totalParts}`);
    const { completion } = await makeLLMCall(
          transcript,
          systemPrompt,
          userPrompt,
          instructions,
      );
      if(completion.choices.length === 0 || !completion?.choices[0]?.message?.content){
        logger.error(`No content returned from LLM for file ${fileId}`);
        throw new Error(`No content returned from LLM for file`);
      }
      if(completion.choices[0].message.content){
        logger.info(`Marked transcript part: ${currentPart} of ${totalParts}`);
        return completion.choices[0].message.content;
      }
    }, {
      maxRetries: 2,
      initialDelayMs: 1000,
      maxDelayMs: 32000,
      backoffFactor: 2,
      retryErrors: [
        "429|rate limit|too many requests",
        "500|internal server error",
        "No content returned from LLM for file"
      ],
    });
    if(!result.success){
      throw result.error || new Error(`No content returned from LLM for file ${fileId}`);
    }
    return result.data;
  }catch(error){
    logger.error(`Error while making a call to LLM ${JSON.stringify((error as Error).stack)}`);
    throw error;
  }
}

export const saveProcessWithLLMStats = async (stats: ProcessWithLLMStats) => {
  try{
    logger.info(`Saving process with LLM stats for user ${stats.userId} and file ${stats.fileId}`);
    return await prisma.processWithLLMStats.create({
      data: stats
    })
  }
  catch(error){
    logger.error(`Error while saving process with LLM stats ${error}`);
    throw error;
  }
}