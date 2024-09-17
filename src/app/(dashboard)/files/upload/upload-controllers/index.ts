import { AxiosError } from 'axios'
import { Session } from 'next-auth'
import { toast as toastInstance } from 'sonner/dist/index'

import { BACKEND_URL } from '@/constants'

type ToastInterface = typeof toastInstance

export type UploadFilesType = {
  files: File[] | FileList
  type: string
  toast?: ToastInterface
  session: Session | null
  fetchFiles: () => void
}

export const uploadFiles = async ({
  files,
  type,
  toast,
  session,
  fetchFiles,
}: UploadFilesType) => {
  if (!toast) {
    throw new Error('Toast interface is not provided.')
    return
  }

  const toastId = toast('Sonner')

  toast.loading(`Uploading ${type}...`, {
    description: 'Please do not close the tab!',
    id: toastId,
  })

  try {
    const formData = new FormData()
    Array.from(files).forEach((file) => {
      formData.append('file', file)
      formData.append('webkitRelativePath', file.webkitRelativePath || '')
    })

    const endpoint =
      type === 'files' ? `${BACKEND_URL}/files` : `${BACKEND_URL}/folder-files`

    const xhr = new XMLHttpRequest()
    xhr.open('POST', endpoint, true)
    xhr.setRequestHeader('Authorization', `Bearer ${session?.user?.token}`)

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const percentComplete = (event.loaded / event.total) * 100
        toast.loading(`Uploading ${type}... ${Math.round(percentComplete)}%`, {
          description: 'Please do not close the tab!',
          id: toastId,
        })
      }
    })

    xhr.addEventListener('load', () => {
      toast.dismiss(toastId)
      if (xhr.status >= 200 && xhr.status < 300) {
        toast.success(`${type} uploaded successfully`)
        fetchFiles()
      } else {
        const response = JSON.parse(xhr.responseText)
        toast.error(response.message || `Error uploading ${type}`)
      }
    })

    xhr.addEventListener('error', () => {
      toast.dismiss(toastId)
      toast.error(`Error uploading ${type}`)
    })

    xhr.addEventListener('abort', () => {
      toast.dismiss(toastId)
      toast.error(`Upload aborted`)
    })

    xhr.send(formData)
  } catch (error) {
    if (error instanceof AxiosError && error.response) {
      const message = error.response.data.message
      const errorToastId = toast.error(message)
      toast.dismiss(errorToastId)
    } else {
      const errorToastId = toast.error(`Error uploading ${type}`)
      toast.dismiss(errorToastId)
      throw new Error(
        `Error uploading ${type}: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
    }
    toast.dismiss(toastId)
  }
}
