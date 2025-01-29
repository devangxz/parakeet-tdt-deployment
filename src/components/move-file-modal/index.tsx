'use client'
import { FolderClosed, ArrowLeft } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog'
import { moveFileAction } from '@/app/actions/files/move'
import { getFolders } from '@/app/actions/folders'

interface Folder {
    id: number
    name: string
    parentId: number | null
    createdAt: string
    updatedAt: string
}

interface MoveFileDialogProps {
    selectedFile: {
        fileId: string
        name: string
        orderId: string
        orderType: string
    } | null,
    isMoveFileDialogOpen: boolean
    setIsMoveFileDialogOpen: (isMoveFileDialogOpen: boolean) => void
    folderId: string | null
    refetch: () => void
}

const MoveFileModal = ({
    selectedFile,
    isMoveFileDialogOpen,
    setIsMoveFileDialogOpen,
    folderId,
    refetch,
}: MoveFileDialogProps) => {
    const [allFolders, setAllFolders] = useState<Folder[] | null>(null)
    const [currentFolderId, setCurrentFolderId] = useState<number | null>(folderId ? Number(folderId) : null)
    const [currentFolder, setCurrentFolder] = useState(allFolders?.find(f => f.id === currentFolderId) || null)

    const fetchAllFolders = async () => {
        try {
            const folders = await getFolders('null', true)
            if (!folders?.success) {
                throw new Error(folders?.message)
            }
            const formattedFolders =
                folders?.folders?.map((folder) => ({
                    ...folder,
                    createdAt: folder.createdAt.toString(),
                    updatedAt: folder.updatedAt.toString(),
                    date: folder.createdAt.toString(),
                })) ?? []
            setAllFolders(formattedFolders)
            setCurrentFolder(formattedFolders?.find(f => f.id === currentFolderId) || null)
        } catch (err) {
            console.error('Failed to fetch folders:', err)
        }
    }

    useEffect(() => {
        fetchAllFolders()
    }, [])

    useEffect(() => {
        setCurrentFolder(allFolders?.find(f => f.id === currentFolderId) || null)
    }, [currentFolderId])

    useEffect(() => {
        setCurrentFolderId(folderId ? Number(folderId) : null)
    }, [folderId])

    const moveFileHandler = async () => {
        if (!selectedFile) {
            toast.error('Please select a file to move')
            return
        }
        const toastId = toast.loading('Moving file...')
        const res = await moveFileAction(selectedFile?.fileId, currentFolderId)
        if (res.success) {
            toast.success('File moved successfully')
            toast.dismiss(toastId)
            refetch()
            setIsMoveFileDialogOpen(false)
        } else {
            toast.dismiss(toastId)
            toast.error('Failed to move file')
        }
    }

    return <Dialog open={isMoveFileDialogOpen} onOpenChange={setIsMoveFileDialogOpen}>
        <DialogContent className="max-h-[80vh]">
            <DialogHeader>
                <div className='flex items-center'>
                    <button onClick={() => setCurrentFolderId(currentFolder?.parentId || null)} className="mr-2 hover:bg-gray-200 p-1 rounded-lg">
                        <ArrowLeft />
                    </button>
                    <DialogTitle>{currentFolder?.name || 'My Workspace'}</DialogTitle>
                </div>

            </DialogHeader>

            <div>

                {allFolders ? <div>
                    {allFolders?.filter(folder => folder.parentId === currentFolderId).length === 0 ? (
                        <div className="text-gray-500 text-center py-4">Empty folder</div>
                    ) : (
                        allFolders
                            ?.filter(folder => folder.parentId === currentFolderId)
                            .map(folder => (
                                <button
                                    key={folder.id}
                                    className="w-full flex items-center justify-start mb-2 hover:bg-gray-200 p-2 rounded-lg gap-2"
                                    onClick={() => setCurrentFolderId(folder.id)}
                                >
                                    <FolderClosed />
                                    {folder.name}
                                </button>
                            ))
                    )}
                </div>
                    :
                    <div className="text-gray-500 flex items-center justify-center text-center py-4">
                        Loading...
                    </div>
                }

            </div>

            <DialogFooter>
                <Button className='w-full' onClick={moveFileHandler} type="submit">Move Here</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
}

export default MoveFileModal