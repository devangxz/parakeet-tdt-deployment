import axios from 'axios';
import { toast } from 'sonner';

import { UPLOAD_MAX_RETRIES, UPLOAD_RETRY_DELAY } from '@/constants';
import { StreamingState } from '@/types/upload';
import sleep from '@/utils/sleep';

export const isRetryableError = (error: unknown): boolean => {
    if (!axios.isAxiosError(error)) return false;

    const retryableStatusCodes = [408, 429, 500, 502, 503, 504];
    return !error.response?.status || retryableStatusCodes.includes(error.response.status);
};

export const handleRetryableError = async (error: unknown, retryCount: number): Promise<void> => {
    if (axios.isCancel(error)) {
        throw new Error('Upload cancelled');
    }

    if (!isRetryableError(error)) {
        throw error;
    }

    if (retryCount >= UPLOAD_MAX_RETRIES) {
        throw new Error(`File upload failed after ${UPLOAD_MAX_RETRIES} attempts`);
    }

    const delay = UPLOAD_RETRY_DELAY * Math.pow(2, retryCount);
    await sleep(delay);
};

export const calculateOverallProgress = (
    downloadProgress: number,
    uploadProgress: number,
    downloadWeight: number = 0.3,
    uploadWeight: number = 0.7
): number => (downloadProgress * downloadWeight + uploadProgress * uploadWeight);

export const cleanupUpload = async (
    fileName: string,
    uploadState: StreamingState | undefined,
    uploadStatesRef: React.MutableRefObject<Record<string, StreamingState>>
): Promise<void> => {
    if (uploadState?.uploadId && uploadState?.key) {
        try {
            await axios.post('/api/s3-upload/multi-part/abort', {
                uploadId: uploadState.uploadId,
                key: uploadState.key
            });
        } catch (error) {
            toast.error(`Failed to abort multipart upload for file ${fileName}`);
        }
    }

    if (uploadState?.abortController) {
        uploadState.abortController.abort();
    }

    delete uploadStatesRef.current[fileName];
};

export const refreshToken = async (
    serviceName: string,
): Promise<boolean> => {
    try {
        const response = await axios.get(`/api/s3-upload/${serviceName}/token/refresh`);
        if (response.data.success) {
            return true;
        }
        return false;
    } catch (error) {
        return false;
    }
};