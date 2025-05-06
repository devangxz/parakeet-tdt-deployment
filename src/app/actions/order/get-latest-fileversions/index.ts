"use server"
import { FileTag } from "@prisma/client";

import logger from "@/lib/logger";
import prisma from "@/lib/prisma";
import { CTMType } from "@/types/editor";
import { downloadFromS3, fileExistsInS3, getFileVersionFromS3 } from "@/utils/backend-helper";

export const getAutoFileVersion = async (fileId: string) => {
  try{
    const versionRecs = await prisma.fileVersion.findMany({
      where: {
        fileId,
        tag: { in: [FileTag.AUTO, FileTag.ASSEMBLY_AI, FileTag.ASSEMBLY_AI_GPT_4O] },
        s3VersionId: { not: null }
      },
      select: { tag: true, s3VersionId: true },
      orderBy: { createdAt: 'asc' }
    });
    let ctms: CTMType[] = [];
    let s3VersionId: string | null = null;
    const autoRec = versionRecs.find(v => v.tag === FileTag.AUTO);
    if (autoRec?.s3VersionId) {
      s3VersionId = autoRec.s3VersionId;
      const assemblyMatch = versionRecs.find(v => v.tag === FileTag.ASSEMBLY_AI && v.s3VersionId === s3VersionId);
      const combinedMatch = versionRecs.find(v => v.tag === FileTag.ASSEMBLY_AI_GPT_4O && v.s3VersionId === s3VersionId);
      if (assemblyMatch) {
        ctms = JSON.parse((await downloadFromS3(`${fileId}_assembly_ai_ctms.json`)).toString());
        s3VersionId = assemblyMatch.s3VersionId;
      } else if (combinedMatch) {
        ctms = JSON.parse((await downloadFromS3(`${fileId}_assembly_ai_gpt_4o_ctms.json`)).toString());
        s3VersionId = combinedMatch.s3VersionId;
      } else if (await fileExistsInS3(`${fileId}_ctms.json`)) {
        ctms = JSON.parse((await downloadFromS3(`${fileId}_ctms.json`)).toString());
      }
    }
    if (!s3VersionId) {
      throw new Error('No s3 version id found');
    }
    const transcript = (await getFileVersionFromS3(`${fileId}.txt`, s3VersionId as string)).toString();
    return {
      success: true,
      ctms,
      transcript
    }
  }
  catch(error){
    logger.error(`[getLatestFileVersions] error: ${error}`);
    return {
      success: false,
      message: "Error getting latest file versions",
      ctms: [], 
      transcript: ""
    }
  }
}

export const getLatestFileVersion = async (fileId: string) => {
  try{
    let fileVersion: string | null = null;
    const customerEditFileVersion = await prisma.fileVersion.findFirst({
      where: {
        fileId: fileId,
        tag: FileTag.CUSTOMER_EDIT,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        s3VersionId: true,
      },
    })

    if (!customerEditFileVersion || !customerEditFileVersion.s3VersionId) {
      const customerDeliveredFileVersion = await prisma.fileVersion.findFirst({
        where: {
          fileId: fileId,
          tag: FileTag.CUSTOMER_DELIVERED,
        },
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          s3VersionId: true,
        },
      })

      if (
        !customerDeliveredFileVersion ||
        !customerDeliveredFileVersion.s3VersionId
      ) {
        return {
          success: false,
          message: 'Transcript not found',
          transcript: ''
        }
      }

      fileVersion = customerDeliveredFileVersion.s3VersionId
    }
    const transcript = (await getFileVersionFromS3(`${fileId}.txt`, fileVersion as string)).toString();
    return {
      success: true,
      transcript
    }
  }
  catch(error){
    logger.error(`[getLatestFileVersion] error: ${error}`);
    return {
      success: false,
      message: "Error getting latest file version",
      transcript: ''
    }
  }
}
