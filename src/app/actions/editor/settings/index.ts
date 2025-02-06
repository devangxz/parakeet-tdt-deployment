'use server'

import { revalidatePath } from 'next/cache'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { EditorSettings } from '@/types/editor'

interface ActionResponse {
  success: boolean
  settings?: EditorSettings
  error?: string
}

export async function getUserEditorSettingsAction(): Promise<ActionResponse> {
  const session = await getServerSession(authOptions)
  const user = session?.user
  const userId = user?.userId

  if (!userId) {
    logger.error('Missing userId for editor settings fetch')
    return {
      success: false,
      error: 'Missing userId',
    }
  }

  try {
    const settings = await prisma.userEditorSettings.findUnique({
      where: {
        userId: userId,
      },
    })

    if (!settings) {
      const defaultSettings: EditorSettings = {
        wordHighlight: true,
        fontSize: 16,
        audioRewindSeconds: 0,
        volume: 100,
        playbackSpeed: 100,
        useNativeContextMenu: false,
        shortcuts: {},
      }

      return {
        success: true,
        settings: defaultSettings,
      }
    }

    const editorSettings: EditorSettings = {
      wordHighlight: settings.wordHighlight,
      fontSize: settings.fontSize,
      audioRewindSeconds: settings.audioRewindSeconds,
      volume: settings.volume,
      playbackSpeed: settings.playbackSpeed,
      useNativeContextMenu: settings.useNativeContextMenu,
      shortcuts: settings.shortcuts as Record<string, string>,
    }
    return {
      success: true,
      settings: editorSettings,
    }
  } catch (error) {
    logger.error(`Error fetching editor settings for user ${userId}: ${error}`)
    return {
      success: false,
      error: 'Error fetching editor settings',
    }
  }
}

export async function updateEditorSettingsAction(
  settings: EditorSettings
): Promise<ActionResponse> {
  const session = await getServerSession(authOptions)
  const user = session?.user
  const userId = user?.userId

  if (!userId) {
    logger.error('Missing userId for editor settings update')
    return {
      success: false,
      error: 'Missing userId',
    }
  }

  try {
    const updatedSettings = await prisma.userEditorSettings.upsert({
      where: {
        userId: userId,
      },
      update: {
        ...settings,
        shortcuts: settings.shortcuts,
      },
      create: {
        userId: userId,
        ...settings,
        shortcuts: settings.shortcuts,
      },
    })

    revalidatePath('/editor/[fileId]')

    return {
      success: true,
      settings: {
        wordHighlight: updatedSettings.wordHighlight,
        fontSize: updatedSettings.fontSize,
        audioRewindSeconds: updatedSettings.audioRewindSeconds,
        volume: updatedSettings.volume,
        playbackSpeed: updatedSettings.playbackSpeed,
        useNativeContextMenu: updatedSettings.useNativeContextMenu,
        shortcuts: updatedSettings.shortcuts as Record<string, string>,
      },
    }
  } catch (error) {
    logger.error(`Error updating editor settings for user ${userId}: ${error}`)
    return {
      success: false,
      error: 'Error updating editor settings.',
    }
  }
}

export async function updateShortcutAction(
  action: string,
  shortcut: string
): Promise<ActionResponse> {
  const session = await getServerSession(authOptions)
  const user = session?.user
  const userId = user?.userId

  if (!userId) {
    logger.error('Missing userId for shortcut update')
    return {
      success: false,
      error: 'Missing userId',
    }
  }

  try {
    const currentSettings = await prisma.userEditorSettings.findUnique({
      where: {
        userId: userId,
      },
    })

    const currentShortcuts = {
      ...(currentSettings?.shortcuts as Record<string, string>),
      [action]: shortcut,
    }

    const updatedSettings = await prisma.userEditorSettings.upsert({
      where: {
        userId: userId,
      },
      update: {
        shortcuts: currentShortcuts,
      },
      create: {
        userId: userId,
        wordHighlight: true,
        fontSize: 16,
        audioRewindSeconds: 0,
        volume: 100,
        playbackSpeed: 100,
        useNativeContextMenu: false,
        shortcuts: currentShortcuts,
      },
    })

    revalidatePath('/editor/[fileId]')

    return {
      success: true,
      settings: {
        ...updatedSettings,
        shortcuts: updatedSettings.shortcuts as Record<string, string>,
      },
    }
  } catch (error) {
    logger.error(`Error updating shortcut for user ${userId}: ${error}`)
    return {
      success: false,
      error: 'Error updating shortcut.',
    }
  }
}

export async function restoreDefaultShortcutsAction(): Promise<ActionResponse> {
  const session = await getServerSession(authOptions)
  const user = session?.user
  const userId = user?.userId

  if (!userId) return { success: false, error: 'Unauthorized' }

  try {
    const updatedSettings = await prisma.userEditorSettings.update({
      where: { userId: userId },
      data: {
        shortcuts: {},
      },
    })

    revalidatePath('/editor/[fileId]')

    return {
      success: true,
      settings: {
        ...updatedSettings,
        shortcuts: {},
      },
    }
  } catch (error) {
    logger.error(
      `Error restoring default shortcuts for user ${userId}: ${error}`
    )
    return { success: false, error: 'Failed to restore defaults' }
  }
}
