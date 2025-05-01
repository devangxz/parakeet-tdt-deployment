import { toast } from "sonner";

import { getAutoFileVersion, getLatestFileVersion } from "@/app/actions/order/get-latest-fileversions";
import { generateSubtitles } from "@/utils/editorUtils";
import { createAlignments, updateAlignments } from "@/utils/transcript";

/**
 * Process files in smaller batches to avoid overwhelming system resources
 */
const processBatch = async (fileIds: string[], batchSize: number = 20) => {
  const results = { success: 0, failed: 0, total: fileIds.length };

  try {
    // Process in batches to avoid overwhelming the system
    for (let i = 0; i < fileIds.length; i += batchSize) {
      const batch = fileIds.slice(i, i + batchSize);
      
      // Process batch concurrently
      const batchResults = await Promise.all(
        batch.map(async (fileId) => {
          try {
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
            return { success: true, fileId };
          } catch (error) {
            return { success: false, fileId, error };
          }
        })
      );
      
      // Count results
      batchResults.forEach(result => {
        result.success ? results.success++ : results.failed++;
      });
    }
    
    return results.failed === 0;
  } catch (error) {
    toast.error('Failed to generate subtitles');
    return false;
  }
};

export const generateSubtitlesInZipDialog = async (fileIds: string[]) => {
  try {
    return await processBatch(fileIds);
  } catch (error) {
    toast.error('Failed to generate subtitles');
    return false;
  }
}
