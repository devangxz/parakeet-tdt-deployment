"use server";

import { getServerSession } from "next-auth";

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from "@/lib/logger";
import prisma from "@/lib/prisma";

export async function saveReviewWithGeminiStats(data: {
  fileId: string;
  options: string[];
  instructions: string;
  temperature: number;
  duration: number;
  startTime: Date;
  endTime: Date;
  savedTime: Date;    
}) {
  const session = await getServerSession(authOptions) 
  const user = session?.user
  logger.info(`Saving review with gemini stats for user ${user?.userId} and file ${data.fileId}`);
  return await prisma.reviewWithGeminiStats.create({
    data: {
      userId: user?.userId as number,
      fileId: data.fileId,
      options: data.options,
      instructions: data.instructions,
      temperature: data.temperature,
      startTime: data.startTime,
      endTime: data.endTime,
      savedTime: data.savedTime,
      duration: data.duration,
    },
  });
} 