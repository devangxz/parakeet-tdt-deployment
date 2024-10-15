import { ReloadIcon } from '@radix-ui/react-icons'
import axios, { AxiosError } from 'axios'
import { useState } from 'react'
import { toast } from 'sonner'

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface DialogProps {
  open: boolean
  onClose: () => void
  fileId: string
}

const SetFileAccentDialog = ({ open, onClose, fileId }: DialogProps) => {
  const [accent, setAccent] = useState('NA')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const response = await axios.post(`/api/om/update-accent`, {
        fileId,
        accent,
      })
      if (response.data.success) {
        const successToastId = toast.success(`Successfully updated accent`)
        toast.dismiss(successToastId)
        setLoading(false)
        onClose()
      } else {
        toast.error(response.data.message)
        setLoading(false)
      }
    } catch (error) {
      if (error instanceof AxiosError && error.response) {
        const errorToastId = toast.error(error.response?.data?.s)
        toast.dismiss(errorToastId)
      } else {
        toast.error(`Error updating accent`)
      }
      setLoading(false)
    }
  }
  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Set Accent</AlertDialogTitle>
          <AlertDialogDescription>
            <div className='grid items-center gap-1.5'>
              <Label>Please select the accent below</Label>
              <Select
                defaultValue={accent}
                onValueChange={(value) => setAccent(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder='Speaker Accent' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='NA'>North American</SelectItem>
                  <SelectItem value='CA'>Canadian</SelectItem>
                  <SelectItem value='AU'>Australian</SelectItem>
                  <SelectItem value='GB'>British</SelectItem>
                  <SelectItem value='IN'>Indian</SelectItem>
                  <SelectItem value='AA'>African-American</SelectItem>
                  <SelectItem value='AF'>African</SelectItem>
                  <SelectItem value='RW'>Rwandan</SelectItem>
                  <SelectItem value='GR'>German</SelectItem>
                  <SelectItem value='FR'>French</SelectItem>
                  <SelectItem value='IT'>Italian</SelectItem>
                  <SelectItem value='PL'>Polish</SelectItem>
                  <SelectItem value='EU'>European</SelectItem>
                  <SelectItem value='SP'>Spanish</SelectItem>
                  <SelectItem value='RU'>Russian</SelectItem>
                  <SelectItem value='FN'>Finnish</SelectItem>
                  <SelectItem value='TK'>Turkish</SelectItem>
                  <SelectItem value='ID'>Indonesian</SelectItem>
                  <SelectItem value='MX'>Mexican</SelectItem>
                  <SelectItem value='HP'>Hispanic</SelectItem>
                  <SelectItem value='LA'>Latin American</SelectItem>
                  <SelectItem value='BR'>Brazilian</SelectItem>
                  <SelectItem value='PR'>Portugese</SelectItem>
                  <SelectItem value='NL'>Dutch</SelectItem>
                  <SelectItem value='ME'>Middle Eastern</SelectItem>
                  <SelectItem value='IR'>Irish</SelectItem>
                  <SelectItem value='AS'>Asian</SelectItem>
                  <SelectItem value='CN'>Chinese</SelectItem>
                  <SelectItem value='KO'>Korean</SelectItem>
                  <SelectItem value='SG'>Singaporean</SelectItem>
                  <SelectItem value='EA'>East Asian</SelectItem>
                  <SelectItem value='NZ'>New Zealand</SelectItem>
                  <SelectItem value='AB'>Arabic</SelectItem>
                  <SelectItem value='MY'>Malaysian</SelectItem>
                  <SelectItem value='JP'>Japanese</SelectItem>
                  <SelectItem value='SE'>Southeast Asian</SelectItem>
                  <SelectItem value='SA'>South African</SelectItem>
                  <SelectItem value='JM'>Jamaican</SelectItem>
                  <SelectItem value='WI'>West Indian</SelectItem>
                  <SelectItem value='AG'>Aboriginal</SelectItem>
                  <SelectItem value='SC'>Scottish</SelectItem>
                  <SelectItem value='NP'>Nepalese</SelectItem>
                  <SelectItem value='EG'>Egyptian</SelectItem>
                  <SelectItem value='AI'>Indigenous American</SelectItem>
                  <SelectItem value='NTA'>
                    Unsure/Unknown/Not Applicable
                  </SelectItem>
                  <SelectItem value='NN'>Other Non-native/Mixed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Close</AlertDialogCancel>
          <AlertDialogAction onClick={handleSubmit}>
            {loading ? (
              <>
                Please wait
                <ReloadIcon className='ml-2 h-4 w-4 animate-spin' />
              </>
            ) : (
              'Update'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default SetFileAccentDialog
