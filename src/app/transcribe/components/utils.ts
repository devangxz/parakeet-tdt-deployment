import { AxiosResponse } from 'axios'
import { toast } from 'sonner'

import { BACKEND_URL, HIGH_PWER, LOW_PWER } from '@/constants'
import axiosInstance from '@/utils/axios'

type GetAudioUrlOptions = {
  fileId: string
}
type PwerLevel = 'HIGH' | 'MEDIUM' | 'LOW'

export const getAudioUrl = async ({
  fileId,
}: GetAudioUrlOptions): Promise<string | undefined> => {
  try {
    const response: AxiosResponse<Blob> = await axiosInstance.get(
      `${BACKEND_URL}/get-audio/${fileId}`,
      { responseType: 'blob' }
    )

    const url = URL.createObjectURL(response.data)
    return url
  } catch (error) {
    toast.error('Failed to play audio.')
    return undefined
  }
}

export const determinePwerLevel = (pwer: number): PwerLevel => {
  if (pwer > HIGH_PWER) return 'HIGH'
  if (pwer < LOW_PWER) return 'LOW'
  return 'MEDIUM'
}

export const determineRate = (
  pwer: number,
  rateConfig: { high: number; medium: number; low: number }
): number => {
  switch (determinePwerLevel(pwer)) {
    case 'HIGH':
      return rateConfig.high
    case 'LOW':
      return rateConfig.low
    default:
      return rateConfig.medium
  }
}
