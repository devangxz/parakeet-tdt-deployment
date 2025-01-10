'use client'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { CreateOneFolder } from '@/app/actions/folders/creaet-one'

interface CreateFolderDialogProps {
    isCreateFolderDialogOpen: boolean
    setIsCreateFolderDialogOpen: (isMoveFileDialogOpen: boolean) => void
    folderId: string | null
    refetch: () => void
}

const CreateFolderModal = ({
    isCreateFolderDialogOpen,
    setIsCreateFolderDialogOpen,
    folderId,
    refetch,
}: CreateFolderDialogProps) => {

    const [folderName, setFolderName] = useState('')

    const createFolderHandler = async () => {
        if (folderName.trim() === '') {
            toast.error('Please enter a valid folder name')
            return
        }
        const toastId = toast.loading('Creating folder...')
        const res = await CreateOneFolder(folderId ? Number(folderId) : null, folderName.trim())
        if (res.success) {
            toast.success('Folder created successfully')
            refetch()
            toast.dismiss(toastId)
            setIsCreateFolderDialogOpen(false)
        } else {
            toast.dismiss(toastId)
            toast.error('Failed to create folder')
        }
    }

    return <Dialog open={isCreateFolderDialogOpen} onOpenChange={setIsCreateFolderDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
                <DialogTitle>Create folder</DialogTitle>
            </DialogHeader>
            <div>
                <Label htmlFor="folder-name" className="text-right">
                    Folder name
                </Label>
                <Input id="folder-name" placeholder="New Folder" value={folderName} onChange={(e) => setFolderName(e.target.value)} className="w-full" />
            </div>

            <DialogFooter>
                <Button className='w-full' onClick={createFolderHandler} type="submit">Create folder</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
}

export default CreateFolderModal