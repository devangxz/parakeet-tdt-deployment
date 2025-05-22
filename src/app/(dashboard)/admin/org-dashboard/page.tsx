'use client'

import { Check, ChevronsUpDown, Loader2, Plus, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

import { addTranscriberToOrg } from '@/app/actions/admin/org-dashboard/add-transcriber-to-org'
import { getOrganizationDetails } from '@/app/actions/admin/org-dashboard/get-organization-details'
import { getOrganizations } from '@/app/actions/admin/org-dashboard/get-organizations'
import { removeQCFromOrg } from '@/app/actions/admin/org-dashboard/remove-qc-from-org'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Command as CommandPrimitive,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

interface Organization {
  id: number
  name: string
  userId: number
  user: {
    email: string
  }
}

interface QCData {
  id: number
  userId: number
  email: string
  name: string
  submittedHours: number
  filesCount: number
}

interface OrganizationDetails {
  id: number
  name: string
  userId: number
  userEmail: string
  userName: string
  qcs: QCData[]
}

export default function OrganizationDashboardPage() {
  const [open, setOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [orgDetails, setOrgDetails] = useState<OrganizationDetails | null>(null)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null)
  const [selectedOrgUserId, setSelectedOrgUserId] = useState<number | null>(
    null
  )
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [selectedQC, setSelectedQC] = useState<QCData | null>(null)
  const [transcriberEmail, setTranscriberEmail] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    async function loadOrganizations() {
      try {
        const orgs = await getOrganizations()
        setOrganizations(orgs)
        setInitialLoading(false)
      } catch (error) {
        toast.error('Failed to load organizations')
        setInitialLoading(false)
      }
    }

    loadOrganizations()
  }, [])

  useEffect(() => {
    async function loadOrgDetails() {
      if (!selectedOrg) {
        setOrgDetails(null)
        return
      }

      setLoading(true)
      try {
        const details = await getOrganizationDetails(
          selectedOrg,
          selectedOrgUserId ?? 0
        )
        setOrgDetails(details)
      } catch (error) {
        toast.error('Failed to load organization details')
      } finally {
        setLoading(false)
      }
    }

    loadOrgDetails()
  }, [selectedOrg])

  const filteredOrganizations = organizations.filter((org) =>
    org.name.toLowerCase().includes(searchValue.toLowerCase())
  )

  const getDisplayName = useCallback((value: string | null) => {
    if (!value) return 'Select organization...'
    return value.split(' (')[0]
  }, [])

  const handleRemoveQC = async () => {
    if (!selectedQC || !orgDetails || !orgDetails.name) return

    setIsProcessing(true)
    try {
      const result = await removeQCFromOrg({
        qcEmail: selectedQC.email,
        orgName: orgDetails.name,
      })

      if (result.success) {
        toast.success(result.message)
        setIsRemoveDialogOpen(false)
        const details = await getOrganizationDetails(
          selectedOrg!,
          selectedOrgUserId ?? 0
        )
        setOrgDetails(details)
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error('Failed to remove QC from organization')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleAddTranscriber = async () => {
    if (!transcriberEmail || !orgDetails || !orgDetails.name) return

    setIsProcessing(true)
    try {
      const result = await addTranscriberToOrg({
        transcriberEmail,
        orgName: orgDetails.name,
      })

      if (result.success) {
        toast.success(result.message)
        const details = await getOrganizationDetails(
          selectedOrg!,
          selectedOrgUserId ?? 0
        )
        setOrgDetails(details)
        setTranscriberEmail('')
        setIsAddDialogOpen(false)
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error('Failed to add transcriber to organization')
    } finally {
      setIsProcessing(false)
    }
  }

  if (initialLoading) {
    return (
      <div className='flex h-screen items-center justify-center'>
        <Loader2 className='h-8 w-8 animate-spin text-primary' />
      </div>
    )
  }

  return (
    <div className='h-full flex-1 flex-col space-y-8 p-5 md:flex'>
      <h1 className='text-lg font-semibold md:text-lg'>
        Organization Dashboard
      </h1>

      <div className='mb-6'>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant='order'
              role='combobox'
              aria-expanded={open}
              className='w-[300px] justify-between not-rounded'
            >
              {getDisplayName(selectedOrg)}
              <ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
            </Button>
          </PopoverTrigger>
          <PopoverContent className='w-[300px] p-0'>
            <CommandPrimitive>
              <CommandInput
                placeholder='Search organization...'
                className='h-9'
                value={searchValue}
                onValueChange={setSearchValue}
              />
              <CommandList>
                <CommandEmpty>No organization found.</CommandEmpty>
                <CommandGroup>
                  {filteredOrganizations.map((org) => (
                    <CommandItem
                      key={org.userId}
                      value={`${org.name} (${org.user.email})`}
                      onSelect={() => {
                        setSelectedOrgUserId(org.userId)
                        setSelectedOrg(org.name)
                        setOpen(false)
                      }}
                    >
                      {org.name} <br /> ({org.user.email})
                      <Check
                        className={cn(
                          'ml-auto h-4 w-4',
                          selectedOrg === `${org.name} (${org.user.email})`
                            ? 'opacity-100'
                            : 'opacity-0'
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </CommandPrimitive>
          </PopoverContent>
        </Popover>
      </div>

      {loading ? (
        <div className='flex h-64 items-center justify-center'>
          <Loader2 className='h-8 w-8 animate-spin text-primary' />
        </div>
      ) : orgDetails ? (
        <div className='space-y-6'>
          <Card>
            <CardHeader>
              <CardTitle>Organization Details</CardTitle>
              <CardDescription>
                Information about the selected organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='space-y-2'>
                <div className='flex items-center'>
                  <span className='font-semibold text-muted-foreground'>
                    Customer Name:
                  </span>
                  <span className='ml-2'>{orgDetails.userName}</span>
                </div>
                <div className='flex items-center'>
                  <span className='font-semibold text-muted-foreground'>
                    CustometEmail:
                  </span>
                  <span className='ml-2'>{orgDetails.userEmail}</span>
                </div>
                <div className='flex items-center'>
                  <span className='font-semibold text-muted-foreground'>
                    Customer ID:
                  </span>
                  <span className='ml-2'>{orgDetails.userId}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='flex flex-row items-center justify-between'>
              <div>
                <CardTitle>QC Performance</CardTitle>
                <CardDescription>
                  QCs mapped to this organization and their work
                </CardDescription>
              </div>

              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant='default' size='sm'>
                    <Plus className='h-4 w-4 mr-2' /> Add Transcriber
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Transcriber to Organization</DialogTitle>
                    <DialogDescription>
                      Enter the email address of the transcriber you want to add
                      to this organization.
                    </DialogDescription>
                  </DialogHeader>

                  <div className='grid gap-4 py-4'>
                    <div className='grid gap-2'>
                      <Label htmlFor='transcriber-email'>
                        Transcriber Email
                      </Label>
                      <Input
                        id='transcriber-email'
                        value={transcriberEmail}
                        onChange={(e) => setTranscriberEmail(e.target.value)}
                        placeholder='Enter transcriber email'
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button
                      variant='outline'
                      onClick={() => setIsAddDialogOpen(false)}
                      disabled={isProcessing}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleAddTranscriber}
                      disabled={!transcriberEmail || isProcessing}
                    >
                      {isProcessing ? (
                        <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                      ) : (
                        <Plus className='h-4 w-4 mr-2' />
                      )}
                      Add
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {orgDetails.qcs.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>QC Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>User ID</TableHead>
                      <TableHead>Files Completed</TableHead>
                      <TableHead>Submitted Hours</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orgDetails.qcs.map((qc) => (
                      <TableRow key={qc.id}>
                        <TableCell>{qc.name}</TableCell>
                        <TableCell>{qc.email}</TableCell>
                        <TableCell>{qc.userId}</TableCell>
                        <TableCell>{qc.filesCount}</TableCell>
                        <TableCell>
                          {qc.submittedHours.toFixed(2)} hours
                        </TableCell>
                        <TableCell>
                          <Dialog
                            open={
                              isRemoveDialogOpen && selectedQC?.id === qc.id
                            }
                            onOpenChange={(open) => {
                              if (!open) {
                                setIsRemoveDialogOpen(false)
                                setSelectedQC(null)
                              }
                            }}
                          >
                            <DialogTrigger asChild>
                              <Button
                                variant='order'
                                onClick={() => {
                                  setSelectedQC(qc)
                                  setIsRemoveDialogOpen(true)
                                }}
                                className='not-rounded'
                              >
                                Remove from Organization
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>
                                  Remove QC from Organization
                                </DialogTitle>
                                <DialogDescription>
                                  Are you sure you want to remove {qc.name} (
                                  {qc.email}) from this organization?
                                </DialogDescription>
                              </DialogHeader>
                              <DialogFooter>
                                <Button
                                  variant='outline'
                                  onClick={() => {
                                    setIsRemoveDialogOpen(false)
                                    setSelectedQC(null)
                                  }}
                                  disabled={isProcessing}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  variant='destructive'
                                  onClick={handleRemoveQC}
                                  disabled={isProcessing}
                                >
                                  {isProcessing ? (
                                    <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                                  ) : (
                                    <Trash2 className='h-4 w-4 mr-2' />
                                  )}
                                  Remove
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className='py-6 text-center text-muted-foreground'>
                  No QCs found for this organization
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className='rounded-lg border border-dashed border-gray-300 p-8 text-center'>
          <h3 className='text-lg font-medium'>No organization selected</h3>
          <p className='mt-2 text-muted-foreground'>
            Select an organization from the dropdown to view details
          </p>
        </div>
      )}
    </div>
  )
}
