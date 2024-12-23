/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { ReloadIcon } from '@radix-ui/react-icons'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'

import { shareFiles } from '@/app/actions/share-file'
import { getExistingSharedUsers } from '@/app/actions/share-file/existing-shared-users'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import getInitials from '@/utils/getInitials'

interface ShareFileDialogProps {
  open: boolean
  onClose: () => void
  fileIds: string[]
  filenames: string[]
}

interface User {
  fullname: string
  email: string
  permission: 'EDITOR' | 'VIEWER'
  initials: string
}

const ShareFileDialog = ({
  open,
  onClose,
  fileIds,
  filenames,
}: ShareFileDialogProps) => {
  const [emails, setEmails] = useState('')
  const [permission, setPermission] = useState<'EDITOR' | 'VIEWER'>('EDITOR')
  const [notifyPeople, setNotifyPeople] = useState(true)
  const [message, setMessage] = useState('')
  const [existingUsers, setExistingUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (open && fileIds.length > 0) {
      fetchExistingSharedUsers()
    }
  }, [open, fileIds])

  const fetchExistingSharedUsers = async () => {
    try {
      const response = await getExistingSharedUsers(fileIds)
      if (response.success && response.data) {
        const users = response.data.map((user: any) => ({
          ...user,
          initials: getInitials(user.fullname || 'NA'),
          fullname: user.fullname || 'N/A',
          is_editor: user.permission === 'EDITOR',
          is_viewer: user.permission === 'VIEWER',
        }))
        setExistingUsers(users)
      }
    } catch (error) {
      console.error('Error fetching existing shared users:', error)
    }
  }

  const handleShare = async () => {
    setIsLoading(true)
    const emailList = emails
      .split(',')
      .map((email) => email.trim())
      .filter((email) => email)
    const newUsers = emailList.map((email) => ({ email, permission }))
    const allUsers = [...existingUsers, ...newUsers]

    try {
      const response = await shareFiles(fileIds, allUsers, message)
      if (response.success) {
        onClose()
        toast.success('File shared successfully')
      }
    } catch (error) {
      toast.error('Error sharing file')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className='sm:max-w-[892px]'>
        <DialogHeader>
          <DialogTitle>Share File{fileIds.length > 1 ? 's' : ''}</DialogTitle>
        </DialogHeader>
        <p>
          {' '}
          {fileIds.length === 1
            ? `You are sharing "${filenames[0]}".`
            : `You are sharing ${filenames
                .slice(0, 2)
                .map((name) => `"${name}"`)
                .join(', ')}${
                filenames.length > 2
                  ? `, and ${filenames.length - 2} more files.`
                  : '.'
              }`}
        </p>
        <div className='grid gap-4 py-4'>
          <div className='flex items-center gap-4'>
            <div className='w-4/5'>
              <Label htmlFor='email' className='mb-2 block'>
                Emails (Separated by comma)
              </Label>
              <Input
                id='email'
                placeholder='john@example.com, jane@example.com'
                value={emails}
                onChange={(e) => setEmails(e.target.value)}
              />
            </div>
            <div className='w-1/5'>
              <Label htmlFor='permission' className='mb-2 block'>
                Permission
              </Label>
              <Select
                onValueChange={(value: 'EDITOR' | 'VIEWER') =>
                  setPermission(value)
                }
                defaultValue={permission}
              >
                <SelectTrigger>
                  <SelectValue placeholder='Select permission' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='EDITOR'>Editor</SelectItem>
                  <SelectItem value='VIEWER'>Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className='flex items-center space-x-2'>
            <Checkbox
              id='notify-people'
              checked={notifyPeople}
              onCheckedChange={(checked) => setNotifyPeople(checked as boolean)}
            />
            <Label htmlFor='notify-people'>Notify people</Label>
          </div>
          {notifyPeople && (
            <div className='grid grid-cols-4 items-center gap-4'>
              <Label htmlFor='message' className='col-span-4'>
                Your Message
              </Label>
              <Textarea
                id='message'
                className='col-span-4'
                placeholder='Your Message'
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
          )}
          {existingUsers.length > 0 && (
            <div>
              <Label>People with access</Label>
              <ScrollArea className='w-full rounded-md border p-4'>
                {existingUsers.map((user, index) => (
                  <div
                    key={index}
                    className='flex items-center justify-between space-x-4 mb-4'
                  >
                    <div className='flex items-center space-x-4'>
                      <Avatar>
                        <AvatarFallback>{user.initials}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className='text-sm font-medium leading-none'>
                          {user.fullname}
                        </p>
                        <p className='text-sm text-muted-foreground'>
                          {user.email}
                        </p>
                      </div>
                    </div>
                    <Select
                      defaultValue={user.permission}
                      onValueChange={(value) => {
                        const updatedUsers = [...existingUsers]
                        updatedUsers[index].permission = value as
                          | 'EDITOR'
                          | 'VIEWER'
                        setExistingUsers(updatedUsers)
                      }}
                    >
                      <SelectTrigger className='w-[200px]'>
                        <SelectValue placeholder='Select permission' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='EDITOR'>Editor</SelectItem>
                        <SelectItem value='VIEWER'>Viewer</SelectItem>
                        <SelectItem value='REMOVE'>Remove access</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </ScrollArea>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant='outline' onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleShare} disabled={isLoading}>
            {isLoading ? (
              <>
                Please wait
                <ReloadIcon className='ml-2 h-4 w-4 animate-spin' />
              </>
            ) : (
              'Share'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ShareFileDialog
