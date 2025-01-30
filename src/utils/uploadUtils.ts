import axios from 'axios'

import { UPLOAD_MAX_RETRIES, UPLOAD_RETRY_DELAY } from '@/constants'
import sleep from '@/utils/sleep'

export const isRetryableError = (error: unknown): boolean => {
  if (!axios.isAxiosError(error)) return false

  const retryableStatusCodes = [408, 429, 500, 502, 503, 504]
  return (
    !error.response?.status ||
    retryableStatusCodes.includes(error.response.status)
  )
}

export const handleRetryableError = async (
  error: unknown,
  retryCount: number
): Promise<void> => {
  if (axios.isCancel(error)) {
    throw new Error('Upload cancelled')
  }

  if (!isRetryableError(error)) {
    throw error
  }

  if (retryCount >= UPLOAD_MAX_RETRIES) {
    throw new Error(`File upload failed after ${UPLOAD_MAX_RETRIES} attempts`)
  }

  const delay = UPLOAD_RETRY_DELAY * Math.pow(2, retryCount)
  await sleep(delay)
}

export const calculateOverallProgress = (
  downloadProgress: number,
  uploadProgress: number,
  downloadWeight: number = 0.3,
  uploadWeight: number = 0.7
): number => downloadProgress * downloadWeight + uploadProgress * uploadWeight

export const refreshToken = async (serviceName: string): Promise<boolean> => {
  try {
    const response = await axios.get(`/auth/${serviceName}/token/refresh`)
    if (response.data.success) {
      return true
    }
    return false
  } catch (error) {
    return false
  }
}

export const sanitizeFileName = (filename: string): string => {
  if (!filename) return 'unnamed_file'
  return (
    filename
      .replace(/：/g, ':')
      .replace(/｜/g, '|')
      .replace(/＜/g, '<')
      .replace(/＞/g, '>')
      .replace(/？/g, '?')
      .replace(/＊/g, '*')
      .replace(/［/g, '[')
      .replace(/］/g, ']')
      .replace(/[\x00-\x1F\x7F]/g, '')
      .replace(/[<>{}^`]/g, '-') || 'unnamed_file'
  )
}
