'use server'

import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

interface ProcessedFile {
    name: string;
    size: number;
    type: string;
    fullPath: string;
    parentPath: string;
    lastModified: number;
}

interface FolderStructure {
    name: string;
    parentPath: string;
    children: FolderStructure[];
}
interface ProcessFileAndFoldersInput {
    folderStructure: FolderStructure;
    files: ProcessedFile[]; // Server doesn't need File objects
}

// Return type should include parentId
interface ProcessedFileWithParent extends ProcessedFile {
    parentId: string | number | null;
}

// Update return type
interface ProcessFilesResponse {
    success: boolean;
    message?: string;
    files?: ProcessedFileWithParent[];
}

export async function processFilesAndFolders({
    folderStructure,
    files,
}: ProcessFileAndFoldersInput): Promise<ProcessFilesResponse> {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user
        const userId = user?.internalTeamUserId || user?.userId

        if (!userId) {
            return {
                success: false,
                message: 'User not authenticated',
            }
        }

        const folderPathToId = new Map<string, string | number>()

        // Only process folders, not files
        const createFoldersRecursively = async (
            folder: FolderStructure,
            currentPath: string
        ) => {
            // Skip if the current item is actually a file
            if (!folder.children.length) return

            const folderPath = currentPath ? `${currentPath}/${folder.name}` : folder.name
            const parentId = folder.parentPath ? folderPathToId.get(folder.parentPath) : null

            const newFolder = await prisma.folder.create({
                data: {
                    name: folder.name,
                    parentId: parentId ? Number(parentId) : null,
                    userId: Number(userId),
                },
            })

            folderPathToId.set(folderPath, newFolder.id)

            // Only recurse if there are child folders
            for (const child of folder.children) {
                await createFoldersRecursively(child, folderPath)
            }
        }

        // Create folders in a transaction
        await prisma.$transaction(async () => {
            await createFoldersRecursively(folderStructure, '')
        })

        // Map files to their parent folders without inserting them
        const processedFiles = files.map((file) => ({
            ...file,
            parentId: folderPathToId.get(file.parentPath) ?? null,
        }));

        return {
            success: true,
            files: processedFiles,
        }
    } catch (error) {
        logger.error('Error processing folders:', error)
        return {
            success: false,
            message: 'An error occurred. Please try again after some time.',
        }
    }
}