import { ReloadIcon } from '@radix-ui/react-icons'
import React, { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { BACKEND_URL } from '@/constants'
import axiosInstance from '@/utils/axios'

type FormData = {
  [key in
    | 'fd_create_templateid'
    | 'fd_update_templateid'
    | 'fd_delete_templateid']: string
}

// New component for template management
function TemplateManagement() {
  const [formData, setFormData] = useState<FormData>({
    fd_create_templateid: '',
    fd_update_templateid: '',
    fd_delete_templateid: '',
  })
  const [loading, setLoading] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target
    setFormData((prevData) => ({ ...prevData, [id]: value }))
  }

  const handleTemplateOperation = async (
    operation: 'create' | 'update' | 'delete'
  ) => {
    try {
      setLoading(true)
      const templateId = formData[`fd_${operation}_templateid`]
      const response = await axiosInstance.get(
        `${BACKEND_URL}/${operation}MailTemplate/${templateId}`
      )
      if (response.status === 200) {
        toast.success(`Successfully ${operation}d template.`)
      }
    } catch (error) {
      toast.error(`Failed to ${operation} template.`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {['create', 'update', 'delete'].map((operation) => (
        <Card key={operation}>
          <CardContent>
            {loading ? (
              <Button disabled className='mt-5'>
                Please wait
                <ReloadIcon className='ml-2 h-4 w-4 animate-spin' />
              </Button>
            ) : (
              <Button
                className='mt-5'
                onClick={() =>
                  handleTemplateOperation(
                    operation as 'create' | 'update' | 'delete'
                  )
                }
              >
                {operation.charAt(0).toUpperCase() + operation.slice(1)}{' '}
                Template
              </Button>
            )}
            <div className='ml-4 inline-block'>
              <p className='mt-2'>
                {operation.charAt(0).toUpperCase() + operation.slice(1)}{' '}
                Template in AWS SES for given mail template id
              </p>
            </div>
            <br />
            <br />
            <div className='grid gap-6'>
              <div className='grid gap-3'>
                <Input
                  id={`fd_${operation}_templateid`}
                  type='text'
                  className='w-1/2'
                  placeholder='mail id'
                  value={
                    formData[`fd_${operation}_templateid` as keyof FormData]
                  }
                  onChange={handleInputChange}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  )
}

function ScrollableReadOnlyKeyValuePairs({
  data,
}: {
  data: Record<string, string>
}) {
  const renderValue = (value: string) => {
    if (typeof value === 'object' && value !== null) {
      return <ScrollableReadOnlyKeyValuePairs data={value} />
    }
    return <span>{JSON.stringify(value)}</span>
  }

  return (
    <div className='pl-4 border-l-2 border-gray-200'>
      {Object.entries(data).map(([key, value]) => (
        <div key={key} className='mb-2'>
          <strong>{key}:</strong> {renderValue(value)}
        </div>
      ))}
    </div>
  )
}

function RISandCFDManagement() {
  const [formData, setFormData] = useState({
    fd_ris_fileid: '',
    fd_ris_Details: {},
    fd_cfd_fileid: '',
    fd_cfd_Details: '',
    fd_cfd_fileid_1: '',
  })
  const [fd_cfd_Details_1, setFdCfdDetails1] = useState('')
  const [loading, setLoading] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target
    setFormData((prevData) => ({ ...prevData, [id]: value }))
  }

  const handleGetRISClick = async () => {
    try {
      const template = 'Deposition'
      const organization = 'remotelegal'

      setLoading(true)
      const response = await axiosInstance.get(
        `${BACKEND_URL}/get-ris-data-dev-dashboard/${formData.fd_ris_fileid}?template=${template}&organization=${organization}`
      )
      const result = response.data
      setFormData((prevData) => ({
        ...prevData,
        fd_ris_Details: result,
      }))
      if (response.status === 200) {
        toast.success('Successfully retrieved RIS data.')
      }
    } catch (error) {
      toast.error('Failed to retrieve RIS data.')
    } finally {
      setLoading(false)
    }
  }

  const handleGetCfdClick = async () => {
    try {
      setLoading(true)
      const response = await axiosInstance.get(
        `${BACKEND_URL}/get-cfd-dev-dashboard/${formData.fd_cfd_fileid}`
      )
      const result = response.data
      // Format the JSON object as a string with indentation
      const formattedResult = JSON.stringify(result, null, 2)
      setFormData((prevData) => ({
        ...prevData,
        fd_cfd_Details: formattedResult,
      }))
      if (response.status === 200) {
        toast.success('Successfully retrieved CFD data.')
      }
    } catch (error) {
      toast.error('Failed to retrieve CFD data.')
      setFormData((prevData) => ({
        ...prevData,
        fd_cfd_Details: '',
      }))
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateCfdClick = async () => {
    try {
      setLoading(true)
      let jsonData
      try {
        jsonData = JSON.parse(fd_cfd_Details_1 as string)
      } catch (error) {
        toast.error('Invalid JSON format. Please check your input.')
        setLoading(false)
        return
      }

      const response = await axiosInstance.post(
        `${BACKEND_URL}/update-cfd-dev-dashboard/`,
        { fileId: formData.fd_cfd_fileid_1, cfd: jsonData }
      )
      const result = response.data
      setFdCfdDetails1(JSON.stringify(result, null, 2))
      if (response.status === 200) {
        toast.success('Successfully updated CFD data.')
      }
    } catch (error) {
      toast.error('Failed to update CFD data.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Get RIS Data */}
      <Card>
        <CardContent>
          <Button
            className='mt-5'
            onClick={handleGetRISClick}
            disabled={loading}
          >
            {loading ? 'Please wait' : 'Get RIS Data'}
            {loading && <ReloadIcon className='ml-2 h-4 w-4 animate-spin' />}
          </Button>
          <div className='ml-4 inline-block'>
            <p className='mt-2'>
              Get RIS data for a file id from the fileId_ris.docx
            </p>
          </div>
          <br />
          <br />
          <Input
            id='fd_ris_fileid'
            type='text'
            className='w-1/2'
            placeholder='file id'
            value={formData.fd_ris_fileid}
            onChange={handleInputChange}
          />
          <div className='w-1/2 border border-gray-300 rounded-md p-4 mt-2 h-64 overflow-auto bg-gray-50'>
            <ScrollableReadOnlyKeyValuePairs data={formData.fd_ris_Details} />
          </div>
        </CardContent>
      </Card>

      {/* Get CFD */}
      <Card>
        <CardContent>
          <Button
            onClick={handleGetCfdClick}
            disabled={loading}
            className='mt-5'
          >
            {loading ? (
              <>
                Fetching CFD
                <ReloadIcon className='ml-2 h-4 w-4 animate-spin' />
              </>
            ) : (
              'Get CFD'
            )}
          </Button>
          <div className='ml-4 inline-block'>
            <p className='mt-2'>
              Get Custom Formatting Details for a file id from the database
            </p>
          </div>
          <br />
          <br />
          <div className='space-y-4'>
            <Input
              id='fd_cfd_fileid'
              type='text'
              placeholder='File ID'
              value={formData.fd_cfd_fileid}
              onChange={handleInputChange}
              className='w-1/2'
            />
            <Textarea
              id='fd_cfd_Details'
              value={formData.fd_cfd_Details}
              readOnly
              className='w-1/2 h-64 font-mono'
              placeholder='CFD details will appear here'
            />
          </div>
        </CardContent>
      </Card>

      {/* Update CFD */}
      <Card>
        <CardContent>
          <Button
            onClick={handleUpdateCfdClick}
            disabled={loading}
            className='mt-5'
          >
            {loading ? (
              <>
                Updating CFD
                <ReloadIcon className='ml-2 h-4 w-4 animate-spin' />
              </>
            ) : (
              'Update CFD'
            )}
          </Button>
          <div className='ml-4 inline-block'>
            <p className='text-sm text-gray-600 mb-4'>
              Update Custom Formatting Details for a file id in the database
            </p>
          </div>
          <br />
          <br />
          <div className='space-y-4'>
            <Input
              id='fd_cfd_fileid_1'
              type='text'
              placeholder='File ID'
              value={formData.fd_cfd_fileid_1}
              onChange={handleInputChange}
              className='w-1/2'
            />
            <Textarea
              id='fd_cfd_Details_1'
              placeholder='Enter CFD JSON data'
              value={fd_cfd_Details_1}
              onChange={(e) => setFdCfdDetails1(e.target.value)}
              className='w-1/2 h-64 font-mono'
            />
          </div>
        </CardContent>
      </Card>
    </>
  )
}

function OrderTasksManagement() {
  const [formData, setFormData] = useState({
    fd_transcribe_fileid: '',
    fd_transcribe_orderid: '',
    fd_format_orderid: '',
    fd_formatex_orderid: '',
    fd_formatex_transcriberid: '',
  })
  const [loading, setLoading] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target
    setFormData((prevData) => ({ ...prevData, [id]: value }))
  }

  const handleTranscribeWithFileIdClick = async () => {
    try {
      setLoading(true)
      const response = await axiosInstance.get(
        `${BACKEND_URL}/transcribe-with-fileId-for-dev-dashboard/${formData.fd_transcribe_fileid}`
      )
      if (response.status === 200) {
        toast.success('Successfully triggered transcribe with file ID.')
      }
    } catch (error) {
      toast.error('Failed to trigger transcribe with file ID.')
    } finally {
      setLoading(false)
    }
  }

  const handleTranscribeClick = async () => {
    try {
      setLoading(true)
      const response = await axiosInstance.get(
        `${BACKEND_URL}/transcribe-for-dev-dashboard/${formData.fd_transcribe_orderid}`
      )
      if (response.status === 200) {
        toast.success('Successfully triggered transcribe with order ID.')
      }
    } catch (error) {
      toast.error('Failed to trigger transcribe with order ID.')
    } finally {
      setLoading(false)
    }
  }

  const handleFormatClick = async () => {
    try {
      setLoading(true)
      const response = await axiosInstance.get(
        `${BACKEND_URL}/format-for-dev-dashboard/${formData.fd_format_orderid}`
      )
      if (response.status === 200) {
        toast.success('Successfully triggered format operation.')
      }
    } catch (error) {
      toast.error('Failed to trigger format operation.')
    } finally {
      setLoading(false)
    }
  }

  const handleFormatExClick = async () => {
    try {
      setLoading(true)
      const response = await axiosInstance.get(
        `${BACKEND_URL}/formatEx-for-dev-dashboard/${formData.fd_formatex_orderid}?transcriber_id=${formData.fd_formatex_transcriberid}`
      )
      if (response.status === 200) {
        toast.success('Successfully triggered format ex operation.')
      }
    } catch (error) {
      toast.error('Failed to trigger format ex operation.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Transcribe with File ID */}
      <Card className='mt-4'>
        <CardContent className='pt-6'>
          <div className='space-y-4'>
            <div className='flex flex-wrap items-center gap-4'>
              <p className='mt-2'>Transcribe</p>
              <Input
                id='fd_transcribe_fileid'
                type='text'
                className='w-1/4'
                placeholder='file ID'
                value={formData.fd_transcribe_fileid}
                onChange={handleInputChange}
              />
              <Button
                onClick={handleTranscribeWithFileIdClick}
                disabled={loading}
              >
                {loading ? 'Please wait' : 'Transcribe'}
                {loading && (
                  <ReloadIcon className='ml-2 h-4 w-4 animate-spin' />
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transcribe with Order ID */}
      <Card className='mt-4'>
        <CardContent className='pt-6'>
          <div className='space-y-4'>
            <div className='flex flex-wrap items-center gap-4'>
              <p className='mt-2'>Transcribe</p>
              <Input
                id='fd_transcribe_orderid'
                type='text'
                className='w-1/4'
                placeholder='order ID'
                value={formData.fd_transcribe_orderid}
                onChange={handleInputChange}
              />
              <Button onClick={handleTranscribeClick} disabled={loading}>
                {loading ? 'Please wait' : 'Transcribe'}
                {loading && (
                  <ReloadIcon className='ml-2 h-4 w-4 animate-spin' />
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Format with Order ID */}
      <Card className='mt-4'>
        <CardContent className='pt-6'>
          <div className='space-y-4'>
            <div className='flex flex-wrap items-center gap-4'>
              <p className='mt-2'>Format</p>
              <Input
                id='fd_format_orderid'
                type='text'
                className='w-1/4'
                placeholder='order ID'
                value={formData.fd_format_orderid}
                onChange={handleInputChange}
              />
              <Button onClick={handleFormatClick} disabled={loading}>
                {loading ? 'Please wait' : 'Format'}
                {loading && (
                  <ReloadIcon className='ml-2 h-4 w-4 animate-spin' />
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Format with Order ID */}
      <Card className='mt-4'>
        <CardContent className='pt-6'>
          <div className='space-y-4'>
            <div className='flex flex-wrap items-center gap-4'>
              <p className='mt-2'>Format</p>
              <Input
                id='fd_formatex_orderid'
                type='text'
                className='w-1/4'
                placeholder='order ID'
                value={formData.fd_formatex_orderid}
                onChange={handleInputChange}
              />
              <Input
                id='fd_formatex_transcriberid'
                type='text'
                className='w-1/4'
                placeholder='transcriber ID'
                value={formData.fd_formatex_transcriberid}
                onChange={handleInputChange}
              />
              <Button onClick={handleFormatExClick} disabled={loading}>
                {loading ? 'Please wait' : 'Format'}
                {loading && (
                  <ReloadIcon className='ml-2 h-4 w-4 animate-spin' />
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  )
}

export default function DevTools() {
  const [formData, setFormData] = useState({
    fd_diskUsage: '',
    fd_qDetails: '',
    fd_s3_fileId: '',
    fd_s3_file_details: '',

    fd_transcribe_fileid: '',
    fd_transcribe_orderid: '',
    fd_format_orderid: '',
    fd_formatex_orderid: '',
    fd_formatex_transcriberid: '',
  })

  const [fd_s3_file_type, setFdS3FileType] = useState('asr')
  const [loading, setLoading] = useState(false)

  // Common control handlers
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target
    setFormData((prevData) => ({ ...prevData, [id]: value }))
  }

  const handleSelectChange = (value: string) => {
    setFdS3FileType(value)
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { id, value } = e.target
    setFormData((prevData) => ({ ...prevData, [id]: value }))
  }

  // Specific action handlers
  const handleGetDiskUsageClick = async () => {
    try {
      setLoading(true)
      const response = await axiosInstance.get(`${BACKEND_URL}/disk-usage`)
      const diskUsage = response.data
      setFormData((prevData) => ({
        ...prevData,
        fd_diskUsage: JSON.stringify(diskUsage.message, null, 2),
      }))
      if (response.status === 200) {
        toast.success('Successfully retireved disk usage.')
        setLoading(false)
      }
    } catch (error) {
      toast.error('Failed to retrieve disk usage.')
      setLoading(false)
    }
  }

  const handleGetRedisDetailsClick = async () => {
    try {
      setLoading(true)
      const response = await axiosInstance.get(
        `${BACKEND_URL}/monitor-for-dev-dashboard`
      )
      const result = response.data
      setFormData((prevData) => ({
        ...prevData,
        fd_qDetails: JSON.stringify(result, null, 2),
      }))
      if (response.status === 200) {
        toast.success('Successfully retireved disk usage.')
        setLoading(false)
      }
    } catch (error) {
      toast.error('Failed to retrieve disk usage.')
      setLoading(false)
    }
  }

  const handleDownloadFromS3Click = async () => {
    try {
      setLoading(true)
      console.log(
        `handleDownloadFromS3Click ${formData.fd_s3_fileId} ${fd_s3_file_type}`
      )
      const response = await axiosInstance.get(
        `${BACKEND_URL}/download-from-s3-dev-dashboard/${formData.fd_s3_fileId}?suffix=${fd_s3_file_type}`
      )
      const signedUrl = response.data
      window.open(signedUrl, '_blank')
      if (response.status === 200) {
        toast.success('Successfully downloaded from s3.')
        setLoading(false)
      }

      toast.success('Successfully downloaded from S3.')
    } catch (error) {
      toast.error('Failed to dowbload from S3.')
      setLoading(false)
    }
  }

  return (
    <Tabs defaultValue='main-tools'>
      <TabsList>
        <TabsTrigger value='main-tools'>Main Tools</TabsTrigger>
        <TabsTrigger value='order-tasks'>Order Tasks</TabsTrigger>
        <TabsTrigger value='ris-cfd-management'>RIS & CFD</TabsTrigger>
        <TabsTrigger value='template-management'>Mail Templates</TabsTrigger>
      </TabsList>

      <TabsContent value='main-tools'>
        {/* Disk Usage */}
        <Card>
          <CardContent>
            {loading ? (
              <Button disabled className='mt-5'>
                Please wait
                <ReloadIcon className='ml-2 h-4 w-4 animate-spin' />
              </Button>
            ) : (
              <Button className='mt-5' onClick={handleGetDiskUsageClick}>
                Get disk usage
              </Button>
            )}
            <div className='ml-4 inline-block'>
              <p className='mt-2'> Retrieve the current disk usage </p>
            </div>
            <br />
            <br />
            <div className='grid gap-6'>
              <div className='grid gap-3'>
                <Input
                  id='result'
                  type='text'
                  className='w-1/2'
                  placeholder='disk usage'
                  value={formData.fd_diskUsage}
                  onChange={handleInputChange}
                  readOnly
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Get Redis Details */}
        <Card>
          <CardContent>
            {loading ? (
              <Button disabled className='mt-5'>
                Please wait
                <ReloadIcon className='ml-2 h-4 w-4 animate-spin' />
              </Button>
            ) : (
              <Button className='mt-5' onClick={handleGetRedisDetailsClick}>
                Get Redis queue details
              </Button>
            )}
            <div className='ml-4 inline-block'>
              <p className='mt-2'> orderQ, fileQ, mailQ, alertQ </p>
            </div>

            <br />
            <br />

            <div className='grid gap-6'>
              <div className='grid gap-3'>
                <textarea
                  id='result'
                  className='w-1/2 h-32 p-2 border rounded resize-none overflow-auto'
                  placeholder='redis queue details'
                  value={formData.fd_qDetails}
                  onChange={handleTextareaChange}
                  readOnly
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Download From AWS S3 */}
        <Card className='mt-4'>
          <CardContent className='pt-6'>
            <div className='space-y-4'>
              <div className='flex flex-wrap items-center gap-4'>
                <p>Download From AWS S3</p>
                <Input
                  id='fd_s3_fileId'
                  type='text'
                  placeholder='S3 file ID'
                  value={formData.fd_s3_fileId}
                  onChange={handleInputChange}
                  className='w-1/4'
                />
                <Select
                  value={fd_s3_file_type}
                  onValueChange={handleSelectChange}
                >
                  <SelectTrigger className='w-[180px]'>
                    <SelectValue placeholder='Select file type' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='asr'>ASR</SelectItem>
                    <SelectItem value='qc'>QC</SelectItem>
                    <SelectItem value='cf'>CF</SelectItem>
                    <SelectItem value='cf_rev'>CF Rev</SelectItem>
                    <SelectItem value='cf_docx'>CF Docx</SelectItem>
                    <SelectItem value='ris'>RIS</SelectItem>
                    <SelectItem value='ctms'>CTMS</SelectItem>
                    <SelectItem value='mp3'>MP3</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleDownloadFromS3Click} disabled={loading}>
                  {loading ? (
                    <>
                      Please wait
                      <ReloadIcon className='ml-2 h-4 w-4 animate-spin' />
                    </>
                  ) : (
                    'Download'
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value='ris-cfd-management'>
        <RISandCFDManagement />
      </TabsContent>

      <TabsContent value='order-tasks'>
        <OrderTasksManagement />
      </TabsContent>

      <TabsContent value='template-management'>
        <TemplateManagement />
      </TabsContent>
    </Tabs>
  )
}
