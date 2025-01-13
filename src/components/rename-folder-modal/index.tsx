'use client'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { renameFolderAction } from '@/app/actions/folders/rename'

interface RenameFolderDialogProps {
    selectedFolder: {
        id: number
        name: string
    }
    isRenameDialogOpen: boolean
    setIsRenameDialogOpen: (isRenameDialogOpen: boolean) => void
    refetch: () => void
}

const RenameFolderModal = ({
    selectedFolder,
    isRenameDialogOpen,
    setIsRenameDialogOpen,
    refetch,
}: RenameFolderDialogProps) => {
    const [newFolderInfo, setNewFolderInfo] = useState({
        id: 0,
        newName: '',
    })

    const handleFolderRename = async () => {
        if (newFolderInfo.newName.trim() === '') {
            toast.error('Please enter a valid folder name')
            return
        } else if (newFolderInfo.newName.trim() === selectedFolder.name) {
            toast.error('Please enter a different folder name')
            return
        }
        const toastId = toast.loading('Renaming folder...')
        const res = await renameFolderAction(newFolderInfo.id, newFolderInfo.newName)
        if (res.success) {
            toast.success('Folder renamed successfully')
            refetch()
            setIsRenameDialogOpen(false)
            toast.dismiss(toastId)
        } else {
            toast.dismiss(toastId)
            toast.error('Failed to rename folder')
        }
    }

    return <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
                <DialogTitle>Rename folder</DialogTitle>
            </DialogHeader>
            <div>
                <Label htmlFor="folder-name" className="text-right">
                    New folder name
                </Label>
                <Input id="folder-name" placeholder={selectedFolder.name} value={newFolderInfo.newName} onChange={(e) => setNewFolderInfo({ id: Number(selectedFolder.id), newName: e.target.value })} className="w-full" />
            </div>
            <DialogFooter>
                <Button className='w-full' onClick={handleFolderRename} type="submit">Rename Folder</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
}

export default RenameFolderModal