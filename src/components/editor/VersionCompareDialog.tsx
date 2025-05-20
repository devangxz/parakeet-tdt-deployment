'use client'

import {
  ArrowRightIcon,
  ReloadIcon,
  CheckIcon,
  ChevronDownIcon,
} from '@radix-ui/react-icons'
import { format, formatDistanceToNow } from 'date-fns'
import React, { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'

import {
  getFileVersionsAction,
  getVersionComparisonAction,
} from '@/app/actions/editor/get-version-diff'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { diff_match_patch, DmpDiff } from '@/utils/transcript/diff_match_patch'

export interface Version {
  commitHash: string | null
  s3VersionId: string | null
  timestamp: string
  message: string
  tag?: string
  source: 'db' | 'git'
}

interface VersionCompareDialogProps {
  isOpen: boolean
  fileId: string
  setDiff: React.Dispatch<React.SetStateAction<DmpDiff[]>>
  renderDiff: (diffs: [number, string][]) => void
}

const TAG_LABELS: Record<string, string> = {
  ASSEMBLY_AI: 'AssemblyAI',
  ASSEMBLY_AI_GPT_4O: 'AssemblyAI + GPT-4o Transcribe',
  QC_EDIT: 'QC Edit',
  QC_DELIVERED: 'QC Submission',
  CUSTOMER_EDIT: 'Customer Edit',
  CUSTOMER_DELIVERED: 'Customer Delivered',
  OM_EDIT: 'OM Edit',
  CF_REV_EDIT: 'Reviewer Edit',
  CF_REV_SUBMITTED: 'Reviewer Submission',
  CF_FINALIZER_EDIT: 'Finalizer Edit',
  CF_FINALIZER_SUBMITTED: 'Finalizer Submission',
  CF_CUSTOMER_DELIVERED: 'Customer Delivered',
  LLM: 'LLM',
  CF_OM_DELIVERED: 'OM Submission',
  GEMINI: 'Gemini',
  TEST: 'Test',
  TEST_MASTER: 'Test Master',
  TEST_MODIFIED: 'Test Modified',
  TEST_EDIT: 'Test Edit',
  TEST_SUBMITTED: 'Test Submission',
}

export default function VersionCompareDialog({
  isOpen,
  fileId,
  setDiff,
  renderDiff,
}: VersionCompareDialogProps) {
  const [versions, setVersions] = useState<Version[]>([])
  const [fromVersion, setFromVersion] = useState<Version | null>(null)
  const [toVersion, setToVersion] = useState<Version | null>(null)
  const [isFetchingVersions, setIsFetchingVersions] = useState(false)
  const [isComparing, setIsComparing] = useState(false)
  const [position, setPosition] = useState({ x: 5, y: 30 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const dialogRef = useRef<HTMLDivElement>(null)
  const [fromPopoverOpen, setFromPopoverOpen] = useState(false)
  const [toPopoverOpen, setToPopoverOpen] = useState(false)
  const [searchFrom, setSearchFrom] = useState<string>('')
  const [searchTo, setSearchTo] = useState<string>('')

  const performComparison = async (from: Version, to: Version) => {
    setIsComparing(true)
    try {
      if (!from || !to) {
        toast.error(
          'Please select both "From" and "To" versions to perform the comparison'
        )
        return
      }

      if (from === to) {
        toast.error(
          'Cannot compare a version with itself. Please select two different versions'
        )
        return
      }

      const result = await getVersionComparisonAction(fileId, from, to)
      if (!result.success || !result.fromText || !result.toText) {
        toast.error(
          result.message ||
            'Unable to retrieve version transcript for comparison'
        )
        return
      }
      const dmp = new diff_match_patch()
      const diffs = dmp.diff_wordMode(result.fromText, result.toText)
      setDiff(diffs)
      renderDiff(diffs)
    } catch {
      toast.error('Unable to retrieve version transcript for comparison')
    } finally {
      setIsComparing(false)
    }
  }

  useEffect(() => {
    const fetchVersions = async () => {
      try {
        setIsFetchingVersions(true)
        const result = await getFileVersionsAction(fileId)

        if (result.success && result.versions?.length) {
          setVersions(result.versions)

          const newFrom = result.versions[result.versions.length - 1]
          const newTo = result.versions[result.versions.length - 2]
          setFromVersion(newFrom)
          setToVersion(newTo)

          if (newFrom && newTo) {
            performComparison(newFrom, newTo)
          }
        } else {
          toast.error(result.message || 'Unable to retrieve versions')
          setVersions([])
        }
      } catch {
        setVersions([])
        toast.error('Unable to retrieve versions')
      } finally {
        setIsFetchingVersions(false)
      }
    }

    if (isOpen && fileId) {
      fetchVersions()
      setSearchFrom('')
      setSearchTo('')
    }
  }, [isOpen, fileId])

  useEffect(() => {
    if (fromVersion && toVersion) {
      performComparison(fromVersion, toVersion)
    }
  }, [fromVersion, toVersion])

  const handleMouseDown = (e: React.MouseEvent) => {
    if (dialogRef.current && !e.defaultPrevented) {
      const target = e.target as HTMLElement
      if (
        target.tagName === 'BUTTON' ||
        target.tagName === 'SELECT' ||
        target.tagName === 'INPUT' ||
        target.closest('[role="combobox"]') ||
        target.closest('[role="option"]')
      ) {
        return
      }

      setIsDragging(true)
      const rect = dialogRef.current.getBoundingClientRect()
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      })
    }
  }

  const handleMouseMove = (ev: globalThis.MouseEvent) => {
    if (isDragging && dialogRef.current) {
      ev.preventDefault()
      const newX = Math.max(0, ev.clientX - dragOffset.x)
      const newY = Math.max(0, ev.clientY - dragOffset.y)

      const maxX = window.innerWidth - dialogRef.current.offsetWidth
      const maxY = window.innerHeight - dialogRef.current.offsetHeight

      setPosition({
        x: Math.min(newX, maxX),
        y: Math.min(newY, maxY),
      })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)

      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isOpen, isDragging])

  const formatVersionLabel = (version: Version) => {
    const timeFormatted = format(
      new Date(version.timestamp),
      'MMM d, h:mm:ss a'
    )

    const rawTag = version.tag || ''
    const tagLabel = TAG_LABELS[rawTag] || rawTag
    return rawTag ? `${timeFormatted} – ${tagLabel}` : `${timeFormatted}`
  }

  const formatSelectVersionLabel = (version: Version) => {
    const timeFormatted = format(
      new Date(version.timestamp),
      'MMM d, h:mm:ss a'
    )
    const timeAgo = formatDistanceToNow(new Date(version.timestamp), {
      addSuffix: true,
    })

    const rawTag = version.tag || ''
    const tagLabel = TAG_LABELS[rawTag] || rawTag
    return (
      <div className='flex flex-col gap-1 items-start'>
        <span className='text-sm text-muted-foreground'>
          {rawTag ? `${tagLabel}` : ''}
        </span>
        <span className='text-sm text-muted-foreground'>
          {`${timeFormatted} (${timeAgo})`}
        </span>
      </div>
    )
  }

  return (
    <div
      ref={dialogRef}
      className={`${
        !isOpen ? 'hidden' : ''
      } fixed z-[40] rounded-lg shadow-lg border bg-background p-4 cursor-move`}
      style={{ top: `${position.y}px`, left: `${position.x}px` }}
      onMouseDown={handleMouseDown}
    >
      <div className='flex flex-col md:flex-row justify-evenly items-center py-2 gap-4'>
        <div className='flex flex-row gap-2 items-center w-full md:w-auto'>
          <label
            htmlFor='from-version'
            className='text-sm font-medium items-center'
          >
            From Version:
          </label>
          <Popover open={fromPopoverOpen} onOpenChange={setFromPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant='outline'
                role='combobox'
                aria-expanded={fromPopoverOpen}
                className='flex justify-between'
                disabled={isFetchingVersions || isComparing}
              >
                {fromVersion
                  ? formatVersionLabel(fromVersion)
                  : 'Select version'}
                <ChevronDownIcon className='ml-2 h-4 w-4 shrink-0' />
              </Button>
            </PopoverTrigger>
            <PopoverContent className='w-[330px] p-0'>
              <Command>
                <CommandInput
                  placeholder='Search versions...'
                  value={searchFrom}
                  onValueChange={setSearchFrom}
                />
                <CommandList>
                  <ScrollArea className='max-h-72 overflow-auto'>
                    <CommandEmpty>No version found</CommandEmpty>
                    <CommandGroup>
                      {versions
                        .filter(
                          (version) =>
                            searchFrom === '' ||
                            formatVersionLabel(version)
                              .toLowerCase()
                              .includes(searchFrom.toLowerCase())
                        )
                        .map((version) => {
                          const versionId =
                            version.s3VersionId ?? version.commitHash ?? ''
                          const selectedFromId =
                            fromVersion?.s3VersionId ??
                            fromVersion?.commitHash ??
                            ''
                          return (
                            <CommandItem
                              className='cursor-pointer'
                              key={version.s3VersionId || version.commitHash}
                              value={formatVersionLabel(version)}
                              onSelect={() => {
                                setFromVersion(version)
                                setFromPopoverOpen(false)
                              }}
                            >
                              <div className='flex-1'>
                                {formatSelectVersionLabel(version)}
                              </div>
                              <CheckIcon
                                className={cn(
                                  'ml-2 h-4 w-4',
                                  versionId === selectedFromId
                                    ? 'opacity-100'
                                    : 'opacity-0'
                                )}
                              />
                            </CommandItem>
                          )
                        })}
                    </CommandGroup>
                  </ScrollArea>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        <div className='hidden md:flex items-center justify-center'>
          {isFetchingVersions || isComparing ? (
            <ReloadIcon className='h-5 w-5 animate-spin text-muted-foreground' />
          ) : (
            <ArrowRightIcon className='h-5 w-5' />
          )}
        </div>

        <div className='flex flex-row gap-2 w-full md:w-auto items-center'>
          <label htmlFor='to-version' className='text-sm font-medium'>
            To Version:
          </label>
          <Popover open={toPopoverOpen} onOpenChange={setToPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant='outline'
                role='combobox'
                aria-expanded={toPopoverOpen}
                className='flex justify-between'
                disabled={isFetchingVersions || isComparing}
              >
                {toVersion ? formatVersionLabel(toVersion) : 'Select version'}
                <ChevronDownIcon className='ml-2 h-4 w-4 shrink-0' />
              </Button>
            </PopoverTrigger>
            <PopoverContent className='w-[330px] p-0'>
              <Command>
                <CommandInput
                  placeholder='Search versions...'
                  value={searchTo}
                  onValueChange={setSearchTo}
                />
                <CommandList>
                  <ScrollArea className='max-h-72 overflow-auto'>
                    <CommandEmpty>No version found</CommandEmpty>
                    <CommandGroup>
                      {versions
                        .filter(
                          (version) =>
                            searchTo === '' ||
                            formatVersionLabel(version)
                              .toLowerCase()
                              .includes(searchTo.toLowerCase())
                        )
                        .map((version) => {
                          const versionId =
                            version.s3VersionId ?? version.commitHash ?? ''
                          const selectedToId =
                            toVersion?.s3VersionId ??
                            toVersion?.commitHash ??
                            ''
                          return (
                            <CommandItem
                              className='cursor-pointer'
                              key={version.s3VersionId || version.commitHash}
                              value={formatVersionLabel(version)}
                              onSelect={() => {
                                setToVersion(version)
                                setToPopoverOpen(false)
                              }}
                            >
                              <div className='flex-1'>
                                {formatSelectVersionLabel(version)}
                              </div>
                              <CheckIcon
                                className={cn(
                                  'ml-2 h-4 w-4',
                                  versionId === selectedToId
                                    ? 'opacity-100'
                                    : 'opacity-0'
                                )}
                              />
                            </CommandItem>
                          )
                        })}
                    </CommandGroup>
                  </ScrollArea>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  )
}
