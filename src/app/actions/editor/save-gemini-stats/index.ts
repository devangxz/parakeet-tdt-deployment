"use server";

import { getServerSession } from "next-auth";

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from "@/lib/logger";
import prisma from "@/lib/prisma";

export async function saveReviewWithGeminiStats(data: {
  fileId: string;
  options?: string[];
  instructions?: string;
  temperature?: number;
  duration?: number;
  startTime?: Date;
  endTime?: Date;
  savedTime?: Date;
  statsId?: number | null;
}) {
  const session = await getServerSession(authOptions) 
  const user = session?.user
  
  if (!user?.userId) {
    throw new Error("User not authenticated");
  }
  
  try {
    const statsData: {
      options?: string[];
      instructions?: string;
      temperature?: number;
      duration?: number;
      startTime?: Date;
      endTime?: Date;
      savedTime?: Date;
    } = {};
    
    if (data.options) statsData.options = data.options
    if (data.instructions) statsData.instructions = data.instructions
    if (data.temperature) statsData.temperature = data.temperature
    if (data.startTime) statsData.startTime = data.startTime 
    if (data.endTime) statsData.endTime = data.endTime 
    if (data.savedTime) statsData.savedTime = data.savedTime 
    if (data.duration) statsData.duration = data.duration 
    
    if (data.statsId) {
      logger.info(`Updating review with gemini stats for user ${user.userId}, file ${data.fileId},id: ${data.statsId}`);

      return await prisma.reviewWithGeminiStats.update({
        where: {
          id: data.statsId
        },
        data: statsData
      });
    }
    
    logger.info(`Creating new review with gemini stats for user ${user.userId}, file ${data.fileId}`);
    
    return await prisma.reviewWithGeminiStats.create({
      data: {
        userId: user.userId as number,
        fileId: data.fileId,
        options: statsData.options || [],
        instructions: statsData.instructions || '',
        temperature: statsData.temperature || 0,
        startTime: statsData.startTime ?? null,
        endTime: statsData.endTime ?? null,
        duration: statsData.duration || 0,
        savedTime: statsData.savedTime ?? null
      },
    });
    
  } catch (error) {
    logger.error(`Error saving review with gemini stats for user ${user.userId} and file ${data.fileId}: ${error}`);
    throw error;
  }
} 