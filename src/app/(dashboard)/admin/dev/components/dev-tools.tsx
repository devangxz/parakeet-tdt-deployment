'use client'

import { Template } from '@prisma/client'
import { ReloadIcon } from '@radix-ui/react-icons'
import React, { useState } from 'react'
import { toast } from 'sonner'

import { getMonitorDetailsAction } from '@/app/actions/admin/monitor-for-dev-dashboard'
import { addOrganization } from '@/app/actions/dev-tools/add-organization'
import { addTemplate } from '@/app/actions/dev-tools/add-templates'
import { downloadFromS3 } from '@/app/actions/dev-tools/download-from-s3'
import { getTemplates } from '@/app/actions/dev-tools/get-templates'
import { createMailTemplate } from '@/app/actions/dev-tools/mail-templates/create'
import { deleteMailTemplate } from '@/app/actions/dev-tools/mail-templates/delete'
import { updateMailTemplate } from '@/app/actions/dev-tools/mail-templates/update'
import { triggerASR } from '@/app/actions/dev-tools/order-tasks/asr-trigger'
import { triggerLLMMarking } from '@/app/actions/dev-tools/order-tasks/llm-trigger'
import { getCFDData } from '@/app/actions/dev-tools/ris/get-cfd-data'
import { getRISData } from '@/app/actions/dev-tools/ris/get-ris-data'
import { updateCfdData } from '@/app/actions/dev-tools/ris/update-cfd-data'
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

      let response = null
      if (operation === 'create') {
        response = await createMailTemplate(templateId)
      } else if (operation === 'update') {
        response = await updateMailTemplate(templateId)
      } else {
        response = await deleteMailTemplate(templateId)
      }

      if (response.success) {
        toast.success(`Successfully ${operation}d template.`)
      } else {
        toast.error(`Failed to ${operation} template.`)
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
      const result = await getRISData(
        formData.fd_ris_fileid,
        template,
        organization
      )

      if (result.success) {
        setFormData((prevData) => ({
          ...prevData,
          fd_ris_Details: result.risData,
        }))
        toast.success('Successfully retrieved RIS data.')
      } else {
        toast.error('Failed to retrieve RIS data.')
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
      const result = await getCFDData(formData.fd_cfd_fileid)

      if (result.success) {
        const formattedResult = JSON.stringify(result.cfdData, null, 2)
        setFormData((prevData) => ({
          ...prevData,
          fd_cfd_Details: formattedResult,
        }))
        toast.success('Successfully retrieved CFD data.')
      } else {
        toast.error('Failed to retrieve CFD data.')
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

      const result = await updateCfdData(formData.fd_cfd_fileid_1, jsonData)

      if (result.success) {
        setFdCfdDetails1(JSON.stringify(result.updatedCfdData, null, 2))
        toast.success('Successfully updated CFD data.')
      } else {
        toast.error('Failed to update CFD data.')
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
      const success = await triggerASR(formData.fd_transcribe_fileid)
      if (success) {
        toast.success('Successfully triggered transcribe with file ID.')
      }
    } catch (error) {
      toast.error('Failed to trigger transcribe with file ID.')
    } finally {
      setLoading(false)
    }
  }

  const handleFormatClick = async () => {
    try {
      setLoading(true)
      const success = await triggerLLMMarking(formData.fd_transcribe_fileid)
      if (success) {
        toast.success('Successfully triggered format operation.')
      }
    } catch (error) {
      toast.error('Failed to trigger format operation.')
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

      {/* Format with File ID */}
      <Card className='mt-4'>
        <CardContent className='pt-6'>
          <div className='space-y-4'>
            <div className='flex flex-wrap items-center gap-4'>
              <p className='mt-2'>Format</p>
              <Input
                id='fd_format_orderid'
                type='text'
                className='w-1/4'
                placeholder='file ID'
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

  const handleGetRedisDetailsClick = async () => {
    try {
      setLoading(true)
      const result = await getMonitorDetailsAction()
      setFormData((prevData) => ({
        ...prevData,
        fd_qDetails: JSON.stringify(result, null, 2),
      }))
      toast.success('Successfully retrieved disk usage.')
    } catch (error) {
      toast.error('Failed to retrieve disk usage.')
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadFromS3Click = async () => {
    try {
      setLoading(true)
      console.log(
        `handleDownloadFromS3Click ${formData.fd_s3_fileId} ${fd_s3_file_type}`
      )
      const signedUrl = await downloadFromS3(
        formData.fd_s3_fileId,
        fd_s3_file_type
      )
      if (signedUrl.success) {
        window.open(signedUrl.signedUrl, '_blank')
        toast.success('Successfully downloaded from S3.')
      } else {
        toast.error('Failed to download from S3.')
      }
    } catch (error) {
      toast.error('Failed to download from S3.')
    } finally {
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
        <TabsTrigger value='b2b-user-onboarding'>
          B2B User Onboarding
        </TabsTrigger>
      </TabsList>

      <TabsContent value='main-tools'>
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
              <p className='mt-2'> orderQ, fileQ, alertQ </p>
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
                    <SelectItem value='rev_docx'>Review Docx</SelectItem>
                    <SelectItem value='finalizer_docx'>Finalizer Docx</SelectItem>
                    <SelectItem value='ris'>RIS</SelectItem>
                    <SelectItem value='ctms'>CTMS</SelectItem>
                    <SelectItem value='mp3'>MP3</SelectItem>
                    <SelectItem value='mp4'>MP4</SelectItem>
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

      <TabsContent value='b2b-user-onboarding'>
        <B2BUserOnboarding />
      </TabsContent>
    </Tabs>
  )
}

// B2B User Onboarding Component
function B2BUserOnboarding() {
  const [templates, setTemplates] = useState<string[]>([])
  const [email, setEmail] = useState('')
  const [orgName, setOrgName] = useState('')
  const [orgEmail, setOrgEmail] = useState('')
  const [templateName, setTemplateName] = useState('')
  const [templateEmail, setTemplateEmail] = useState('')
  const [loading, setLoading] = useState(false)

  const handleFetchTemplates = async () => {
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email')
      return
    }
    setLoading(true)
    try {
      const result = await getTemplates(email)
      if (result.success && result.templates) {
        setTemplates(
          result.templates.map((template: Template) => template.name)
        )
        toast.success('Templates fetched successfully')
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error('Failed to fetch templates')
    } finally {
      setLoading(false)
    }
  }

  const handleAddOrganization = async () => {
    if (!orgName.trim() || !orgEmail.includes('@')) {
      toast.error('Please enter valid organization name and email')
      return
    }
    setLoading(true)
    try {
      await addOrganization(orgName, orgEmail)
      toast.success('Organization added successfully')
      setOrgName('')
      setOrgEmail('')
    } catch (error) {
      toast.error('Failed to add organization')
    } finally {
      setLoading(false)
    }
  }

  const handleAddTemplate = async () => {
    if (!templateName.trim() || !templateEmail.includes('@')) {
      toast.error('Please enter valid template name and email')
      return
    }
    setLoading(true)
    try {
      await addTemplate(templateName, templateEmail)
      toast.success('Template added successfully')
      setTemplateName('')
      setTemplateEmail('')
    } catch (error) {
      toast.error('Failed to add template')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Card className='mt-4'>
        <CardContent className='pt-6'>
          <div className='mb-6'>
            <h4 className='text-md font-medium mb-2'>Fetch Templates</h4>
            <div className='flex space-x-2'>
              <Input
                placeholder='User email'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />{' '}
            </div>
            <Button
              onClick={handleFetchTemplates}
              disabled={loading}
              className='mt-5 w-1/5 mb-5'
            >
              {loading ? 'Fetching...' : 'Fetch'}
            </Button>
            {templates.length > 0 && (
              <ul className='mt-2 list-disc list-inside'>
                {templates.map((template, index) => (
                  <li key={index}>{template}</li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>
      <Card className='mt-4'>
        <CardContent className='pt-6'>
          <div className='mb-6'>
            <h4 className='text-md font-medium mb-2'>Add Organization</h4>
            <div className='flex space-x-2'>
              <Input
                placeholder='Organization Name'
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
              />
              <Input
                placeholder='User Email'
                value={orgEmail}
                onChange={(e) => setOrgEmail(e.target.value)}
              />{' '}
              <br />
            </div>
            <Button
              onClick={handleAddOrganization}
              disabled={loading}
              className='mt-5 w-1/5'
            >
              {loading ? 'Adding...' : 'Add'}
            </Button>
          </div>
        </CardContent>
      </Card>
      <Card className='mt-4'>
        <CardContent className='pt-6'>
          <div>
            <h4 className='text-md font-medium mb-2'>Add Template</h4>
            <p className='text-sm text-gray-600 mb-4'>
              Note: Double check the template name and make sure the template is
              added in the docxTemplate folder.
            </p>
            <div className='flex space-x-2'>
              <Input
                placeholder='Template Name'
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
              />
              <Input
                placeholder='User Email'
                value={templateEmail}
                onChange={(e) => setTemplateEmail(e.target.value)}
              />{' '}
            </div>
            <Button
              onClick={handleAddTemplate}
              disabled={loading}
              className='mt-5 w-1/5'
            >
              {loading ? 'Adding...' : 'Add'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
