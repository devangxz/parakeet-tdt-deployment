import { toast } from "sonner";

import { getAutoFileVersion, getLatestFileVersion } from "@/app/actions/order/get-latest-fileversions";
import { generateSubtitles } from "@/utils/editorUtils";
import { createAlignments, updateAlignments } from "@/utils/transcript";

export const generateSubtitlesInZipDialog = async (fileIds: string[]) => {

  try { 
    await Promise.all(fileIds.map(async (fileId) => {
      const autoFileVersionData = await getAutoFileVersion(fileId);
      if (!autoFileVersionData.success) {
        throw new Error(autoFileVersionData.message);
      }
      
      const autoCtms = autoFileVersionData.ctms;
      const autoTranscript = autoFileVersionData.transcript;
      
      const latestFileVersionData = await getLatestFileVersion(fileId);
      if (!latestFileVersionData.success) {
        throw new Error(latestFileVersionData.message);
      }
      
      const latestTranscript = latestFileVersionData.transcript;
      const autoAlignments = createAlignments(autoTranscript, autoCtms);
      const createUpdatedAlignments = updateAlignments(latestTranscript, autoAlignments, autoCtms);
      
      await generateSubtitles(fileId, createUpdatedAlignments);
    }));
    return true;
  } catch (error) {
    toast.error('Failed to generate subtitles');
    return false;
  }
}
