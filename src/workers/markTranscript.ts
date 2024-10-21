import { JobStatus, JobType, OrderStatus } from "@prisma/client";
import axios from "axios";
import OpenAI from 'openai';
import { ChatCompletionMessageParam } from "openai/resources/index.mjs";

import config from '../../config.json';
import { FILE_CACHE_URL } from "@/constants";
import logger from "@/lib/logger";
import prisma from "@/lib/prisma";
import { getAWSSesInstance } from "@/lib/ses";
import { downloadFromS3 } from "@/utils/backend-helper";
import breakTranscript from "@/utils/breakTranscript";
import { removeTimestamps } from "@/utils/transcriptUtils";

async function makeLLMCall(
    transcriptPart: string,
    systemPrompt: string,
    userPrompt: string,
) {
    if (transcriptPart !== '') {
        userPrompt = userPrompt.replace('{transcriptPart}', transcriptPart);
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
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

async function processTranscriptWithLLM(
    fullTranscript: string,
    systemPrompt: string,
    userPrompt: string,
    fileId: string,
): Promise<string> {
    logger.info(`--> processTranscriptWithLLM ${fileId}`);
    const transcriptParts = breakTranscript(
        fullTranscript,
        config.transcript_part_length,
    );
    const markedParts: string[] = [];

    const numberOfParts = transcriptParts.length;
    logger.info(`Transcript has ${numberOfParts} parts for file ${fileId}`);

    let currentPart = 0;
    let totalTimeTaken = 0;

    const processTranscript = async () => {
        logger.info(`Processing part ${currentPart + 1} of ${numberOfParts} for file ${fileId}`);
        const transcriptPart = transcriptParts[currentPart];

        try {
            const { completion, timeTaken } = await makeLLMCall(
                transcriptPart,
                systemPrompt,
                userPrompt,
            );
            totalTimeTaken += timeTaken;

            if (completion.choices[0].message.content) {
                markedParts.push(completion.choices[0].message.content);
                currentPart++;
                if (currentPart < transcriptParts.length) {
                    await processTranscript();
                }
            }
        } catch (error) {
            const errorMsg = `Error while making a call to LLM for file ${fileId} ${(error as Error).toString()}`;
            logger.error(errorMsg);
            const ses = getAWSSesInstance()
            await ses.sendAlert(`LLM call failed for ${fileId}`, errorMsg, 'software')
            throw error;
        }
    };

    logger.info(`Total time taken for file ${fileId} : ${totalTimeTaken}`);

    await processTranscript();
    logger.info(`Total time taken for file ${fileId} : ${totalTimeTaken}`);
    logger.info(`<-- processTranscriptWithLLM ${fileId}`);
    return markedParts.join('');
}

async function getFormattedTranscript(fullTranscript: string, fileId: string) {
    logger.info(`--> getFormattedTranscript ${fileId}`);
    const system_content =
        "You are a highly skilled AI tasked with understanding the context of a court proceeding transcript. You're task is to identify different sections like the proceeding and examination. You are also required to understand what a person is saying and if the context of the conversation suggests that the person is asking a question or answering a question. You must replace the name of the people with either Q or A. within the examination section there will be some interruption by a third party (not part of the examination) in which case You won't replace their name with Q and A. The most important thing to keep in mind is that you are not given the entire transcript at once. Instead you are only given a part of the transcript because of your token limit so if you are in the examination section make sure you understand the context and if you think the Q&A was started in the previous part and is now continuing then you must handle that case by not marking it as a separate section.";

    const user_content = `{transcriptPart}
  
                    -----
  
                    Given above is the part of a court proceeding transcript. You need to mark the different section like the proceeding and examination by using this syntax [--EXAMINATION--], [--EXAMINATION-CONTINUES--], two lines above the section start. The proceeding section will start as soon as the transcript starts so you don't need to mark it specifically in the transcript. In the examination section there will be two main people, The attorney (examiner) and the witness (examinee) you need to replace there names with "Q " or "A " based on whether its a question or an answer, so this:
  
                    Mr A: And do you remember this collision?
  
                    Mr B: Yes, I do.
  
                    will be turned into this:
  
                    Q And do you remember this collision?
  
                    A Yes, I do.
  
                    In the examination section there might be some interruptions like some third party saying something, in that case you won't replace their name with Q and A. For example:
  
                    Mr A: And do you remember this collision?
  
                    Mr B: Yes, I do.
  
                    Mr C: I'm sorry to interrupt but I have a question.
  
                    will be turned into this:
  
                    Q And do you remember this collision?
  
                    A Yes, I do.
  
                    Mr C: I'm sorry to interrupt but I have a question.
  
                    There is also a scenario where the examiner itself might say something which is not a question like:
  
                    Mr A: And do you remember this collision?
  
                    Mr B: Yes, I do.
  
                    Mr A: That's all I wanted to know.
  
                    In this case you need to replace it with this:
  
                    Q And do you remember this collision?
  
                    A Yes, I do.
  
                    Mr A: That's all I wanted to know.
  
                    As you can see the name "Mr A:" is still there because even though he is the examiner his last line was not a question which is why we did not replace his name with "Q " this time. Please make sure you understand each line before marking it because this is a very important detail.
  
                    So you need to identify what is a Q&A and what's not and mark it accordingly.
  
                    After the witness has swear or affirm that they'll only say the truth in the testimony you'll add the following line in the transcript and replace "<replace_with_examinee_name>" with the name of the witness, The name of the witness should always be in uppercase and after MR or MRS you are not using there full names, Instead just use there last name because its very important. Make sure this line is inserted right after the witness confirms they'll speak only the truth.
  
                    "WHEREUPON, [--EXAMINEE--<replace_with_examinee_name>--EXAMINEE--] having been called as a witness, being duly sworn by the notary public present, testified as follows:".
  
                    Example:
                    
                    --------
                    
                    What was said:
  
                    COURT REPORTER: Can you please raise your right hand? Yes, that's great. Do you swear or affirm that the testimony you'll give today will be the truth, the whole truth, and nothing but the truth?
  
                    Mr. B: Yes, sir.
  
                    The line should be inserted like this:
  
                    COURT REPORTER: Can you please raise your right hand? Yes, that's great. Do you swear or affirm that the testimony you'll give today will be the truth, the whole truth, and nothing but the truth?
  
                    Mr. B: Yes, sir.
  
                    WHEREUPON, [--EXAMINEE--Mr. B--EXAMINEE--] having been called as a witness, being duly sworn by the notary public present, testified as follows:
  
                    --------
  
                    Let's say there was an examination going on and the examination is interrupted by a third party (not part of the examination) in which case you won't replace their name with Q and A. For example:

                    Mr A: And do you remember this collision?

                    Mr B: Yes, I do.

                    Mr C: I'm sorry to interrupt but I have a question.

                    will be turned into this:

                    Q And do you remember this collision?

                    A Yes, I do.

                    Mr C: I'm sorry to interrupt but I have a question.

                    after something like this happens where there is an interruption, You'll have to add [--EXAMINATION-CONTINUES--] in the next line and after that add the by line like this:

                    Q And do you remember this collision?

                    A Yes, I do.

                    Mr C: I'm sorry to interrupt but I have a question.

                    [--EXAMINATION-CONTINUES--]

                    BY <examiner_name>

                    this [--EXAMINATION-CONTINUES--] mark will only be added when the same examiner is going to continue the examination. but if any other examiner is going to take the examination then you'll have to add [--EXAMINATION--] in the next line and after that add the by line like this:

                    Q And do you remember this collision?

                    A Yes, I do.

                    Mr C: I'm sorry to interrupt but I have a question.

                    [--EXAMINATION--]

                    BY <examiner_name>

                    Right after you mark the examination section with [--EXAMINATION--] you need to write "BY <examiner_name>" on the next line and replace "<examiner_name>" with the name of the examining attorney. Make sure you NEVER leave the <examiner_name> as it is. If you can't find the name of the examiner, then you should put something like MR. X or MRS. Y but never leave it empty.
  
                    Make sure each paragraph is separated by an empty line which is very important.
                    `;

    const output = await processTranscriptWithLLM(
        fullTranscript,
        system_content,
        user_content,
        fileId,
    );
    logger.info(`<-- getFormattedTranscript ${fileId}`);
    return output;
}

async function formatTranscript(
    fileId: string,
): Promise<{ LLMTimeTaken: number }> {
    logger.info(`--> formatTranscript ${fileId}`);
    let llmTimeTaken = 0;
    try {
        const transcriptFileName = `${fileId}.txt`;
        const data = (await downloadFromS3(transcriptFileName)).toString();
        let transcript = data;

        if (!transcript) {
            throw new Error('Transcript not found');
        }

        transcript = removeTimestamps(transcript);
        // Format the transcript
        const startTime = Date.now();
        transcript = await getFormattedTranscript(transcript, fileId);

        transcript = "[--PROCEEDINGS--]\n\n" + transcript.replaceAll('. ', '.  ').replaceAll('? ', '? ').replaceAll(': ', ': '); //using a regex here removes the line breaks
        const endTime = Date.now();
        llmTimeTaken = (endTime - startTime) / 1000;

        await axios.post(`${FILE_CACHE_URL}/save-transcript`, {
            fileId: fileId,
            transcript: transcript,
            isCF: true,
        }, {
            headers: {
                'x-api-key': process.env.SCRIBIE_API_KEY
            }
        });

        logger.info(`<-- formatTranscript ${fileId}`);
    } catch (error) {
        logger.error(`Error formatting transcript ${fileId} ${(error as Error).toString()}`);
    }

    return {
        LLMTimeTaken: llmTimeTaken,
    };
}

export async function markTranscript(orderId: number) {
    try {
        const order = await prisma.order.findUnique({
            where: {
                id: orderId,
            },
            include: {
                File: true,
            },
        });

        if (!order) {
            logger.error(`Order not found for ${orderId}`);
            throw new Error(`Order not found for ${orderId}`);
        }

        logger.info(`--> OrderTranscriptionCFFlow:format ${order.fileId}`);
        const details = await formatTranscript(order.fileId);

        const currentReviewAssignment = await prisma.jobAssignment.findFirst({
            where: {
                orderId: order.id,
                type: JobType.REVIEW,
                status: JobStatus.ACCEPTED,
            },
        });

        await prisma.order.update({
            where: {
                id: order.id,
            },
            data: {
                LLMTimeTaken: details.LLMTimeTaken,
                status: currentReviewAssignment
                    ? OrderStatus.REVIEWER_ASSIGNED
                    : OrderStatus.FORMATTED,
            }
        });
    } catch (error) {
        logger.error(
            `Error doing markings for order ${orderId} ${(error as Error).toString()}`,
        );
    }
}