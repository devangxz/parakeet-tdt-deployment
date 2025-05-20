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
      .replace(/[\x00-\x1F\x7F]/g, '')
      .replace(/：/g, ':')
      .replace(/｜/g, '|')
      .replace(/＜/g, '<')
      .replace(/＞/g, '>')
      .replace(/？/g, '?')
      .replace(/＊/g, '*')
      .replace(/［/g, '[')
      .replace(/］/g, ']')
      .replace(/[''‛′‵՚︐]/g, "'")
      .replace(/["""„‟″‶″]/g, '"')
      .replace(/[—–]/g, '-')
      .replace(/[…]/g, '...')
      .replace(/[^\x00-\x7F]/g, function (char) {
        const charCode = char.charCodeAt(0)
        if (
          [
            0x0027, 0x2019, 0x2018, 0x201b, 0x0060, 0x00b4, 0x2032, 0x2035,
            0x2034, 0x2033, 0x02b9, 0x02bc, 0x02be, 0x02c8, 0x02ca, 0x02cb,
            0x02f4, 0x05f3, 0x2018, 0x2019, 0x201a, 0x201b, 0x201c, 0x201d,
            0x201e, 0x201f, 0x2032, 0x2033, 0x2034, 0x2035, 0x2036, 0x2037,
            0x2057, 0x02b9, 0x02ba, 0x02bb, 0x02bc, 0x02bd, 0x02be, 0x02bf,
            0x02c8, 0x02ca, 0x02cb, 0x0060, 0x00b4, 0x2018, 0x2019, 0x201a,
            0x201b, 0x2039, 0x203a,
          ].includes(charCode)
        ) {
          return "'"
        }

        const accentsMap: Record<string, string> = {
          á: 'a',
          à: 'a',
          ä: 'a',
          â: 'a',
          ã: 'a',
          å: 'a',
          é: 'e',
          è: 'e',
          ë: 'e',
          ê: 'e',
          í: 'i',
          ì: 'i',
          ï: 'i',
          î: 'i',
          ó: 'o',
          ò: 'o',
          ö: 'o',
          ô: 'o',
          õ: 'o',
          ú: 'u',
          ù: 'u',
          ü: 'u',
          û: 'u',
          ñ: 'n',
          ç: 'c',
        }

        return accentsMap[char.toLowerCase()] || '_'
      })
      .replace(/[:#\?&;+=,\/\\$@!\|\[\]\{\}\^`~\*%<>]/g, '_') || 'unnamed_file'
  )
}
