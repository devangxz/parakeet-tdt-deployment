'use server'

import { getPendingHighDifficultyCount } from '.'

export async function refreshPendingHighDifficultyCount() {
  return await getPendingHighDifficultyCount()
}
