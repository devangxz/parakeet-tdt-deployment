'use client'

import {
  ArrowRightIcon,
  ReloadIcon,
  CheckIcon,
  ChevronDownIcon,
} from '@radix-ui/react-icons'
import { format, formatDistanceToNow } from 'date-fns'
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { toast } from 'sonner'

import {
  getFileVersionsAction,
  getVersionComparisonAction,
  getVersionTranscriptAction,
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
import { diff_match_patch } from '@/utils/transcript/diff_match_patch'

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
  renderDiff: (diffs: [number, string][]) => void
  currentEditorContent?: string
  onSaveNeeded?: () => Promise<void>
  isExitingDiffMode?: boolean
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
  renderDiff,
  currentEditorContent,
  onSaveNeeded,
  isExitingDiffMode = false,
}: VersionCompareDialogProps) {
  const [versions, setVersions] = useState<Version[]>([])
  const [fromVersion, setFromVersion] = useState<Version | null>(null)
  const [toVersion, setToVersion] = useState<Version | null>(null)
  const [isFetchingVersions, setIsFetchingVersions] = useState(false)
  const [isComparing, setIsComparing] = useState(false)
  const [position, setPosition] = useState({
    x: 5,
    y: window.innerHeight - 150,
  })
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const dialogRef = useRef<HTMLDivElement>(null)
  const [fromPopoverOpen, setFromPopoverOpen] = useState(false)
  const [toPopoverOpen, setToPopoverOpen] = useState(false)
  const [searchFrom, setSearchFrom] = useState<string>('')
  const [searchTo, setSearchTo] = useState<string>('')
  const initialFetchDoneRef = useRef(false)
  const hasPerformedInitialCompareRef = useRef(false)
  const currentEditorContentRef = useRef<string | undefined>(undefined)
  const onSaveNeededRef = useRef<(() => Promise<void>) | undefined>(undefined)

  useEffect(() => {
    currentEditorContentRef.current = currentEditorContent
    onSaveNeededRef.current = onSaveNeeded
  }, [currentEditorContent, onSaveNeeded])

  const performComparison = useCallback(
    async (from: Version, to: Version) => {
      if (isComparing) return false

      setIsComparing(true)
      try {
        const result = await getVersionComparisonAction(fileId, from, to)
        if (!result.success || !result.fromText || !result.toText) {
          toast.error(
            result.message ||
              'Unable to retrieve version transcript for comparison'
          )
          return false
        }

        const dmp = new diff_match_patch()
        const diffs = dmp.diff_contextAwareWordMode(
          result.fromText,
          result.toText
        )
        renderDiff(diffs)
        return true
      } catch {
        toast.error('Unable to retrieve version transcript for comparison')
        return false
      } finally {
        setIsComparing(false)
      }
    },
    [fileId, renderDiff, isComparing]
  )

  const handleVersionSelection = useCallback(
    async (newVersion: Version, isFromVersion: boolean) => {
      const currentVersion = isFromVersion ? fromVersion : toVersion
      const otherVersion = isFromVersion ? toVersion : fromVersion

      if (newVersion === currentVersion) {
        return
      }

      if (!newVersion || !otherVersion) {
        if (isFromVersion) {
          setFromVersion(newVersion)
        } else {
          setToVersion(newVersion)
        }
        return
      }

      if (newVersion === otherVersion) {
        toast.error(
          'Cannot compare a version with itself. Please select two different versions'
        )
        return
      }

      const success = await performComparison(newVersion, otherVersion)

      if (success) {
        if (isFromVersion) {
          setFromVersion(newVersion)
        } else {
          setToVersion(newVersion)
        }
      }
    },
    [fromVersion, toVersion, performComparison]
  )

  useEffect(() => {
    const fetchVersions = async () => {
      if (initialFetchDoneRef.current) return

      try {
        setIsFetchingVersions(true)

        const result = await getFileVersionsAction(fileId)

        if (result.success && result.versions?.length) {
          if (
            currentEditorContentRef.current &&
            onSaveNeededRef.current &&
            result.versions.length > 0
          ) {
            const latestVersion = result.versions[0]
            
            let versionToCompare = latestVersion
            if (latestVersion.tag === 'CUSTOMER_DELIVERED' && result.versions.length > 1) {
              versionToCompare = result.versions[1]
            }
            
            const versionResult = await getVersionTranscriptAction(
              fileId,
              versionToCompare
            )

            if (versionResult.success && versionResult.text) {
              const contentToCompare = versionResult.text

              if (
                currentEditorContentRef.current.trim() !== contentToCompare.trim()
              ) {
                await onSaveNeededRef.current()

                const updatedResult = await getFileVersionsAction(fileId)
                if (updatedResult.success && updatedResult.versions?.length) {
                  setVersions(updatedResult.versions)

                  const fromVersion =
                    updatedResult.versions[updatedResult.versions.length - 1]
                  const toVersion = updatedResult.versions[0]

                  setFromVersion(fromVersion)
                  setToVersion(toVersion)

                  initialFetchDoneRef.current = true
                  setIsFetchingVersions(false)
                  return
                }
              }
            }
          }

          setVersions(result.versions)

          const fromVersion = result.versions[result.versions.length - 1]
          const toVersion = result.versions[0]

          if (result.versions.length === 1) {
            toast.error(
              'At least two versions are required for comparison. Only one version is available for this file.'
            )
          }
          setFromVersion(fromVersion)
          setToVersion(toVersion)
        } else {
          toast.error(result.message || 'Unable to retrieve versions')
          setVersions([])
        }
      } catch {
        setVersions([])
        toast.error('Unable to retrieve versions')
      } finally {
        setIsFetchingVersions(false)
        initialFetchDoneRef.current = true
      }
    }

    if (isOpen && fileId) {
      fetchVersions()
      setSearchFrom('')
      setSearchTo('')

      return () => {
        initialFetchDoneRef.current = false
      }
    }
  }, [isOpen, fileId])

  useEffect(() => {
    if (
      fromVersion &&
      toVersion &&
      !isComparing &&
      !hasPerformedInitialCompareRef.current
    ) {
      performComparison(fromVersion, toVersion)
      hasPerformedInitialCompareRef.current = true
    }
  }, [fromVersion, toVersion, performComparison, isComparing])

  useEffect(() => {
    if (isOpen) {
      hasPerformedInitialCompareRef.current = false
    }
  }, [isOpen])

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

  const formatVersionLabel = (version: Version, isLatestVersion = false) => {
    const timeFormatted = format(
      new Date(version.timestamp),
      'MMM d, h:mm:ss a'
    )

    const rawTag = version.tag || ''
    const tagLabel = TAG_LABELS[rawTag] || rawTag

    const label = rawTag ? `${tagLabel} | ${timeFormatted}` : timeFormatted

    return isLatestVersion ? `${label} (Current Version)` : label
  }

  const formatSelectVersionLabel = (
    version: Version,
    isLatestVersion = false
  ) => {
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
        <div className='flex items-center gap-2'>
          {rawTag && (
            <span className='text-sm text-muted-foreground'>{tagLabel}</span>
          )}
          {isLatestVersion && (
            <span className='inline-flex items-center rounded-sm bg-secondary px-1 py-0.5 text-xs font-medium text-primary'>
              Current Version
            </span>
          )}
        </div>
        <span className='text-sm text-muted-foreground'>
          {`${timeFormatted} (${timeAgo})`}
        </span>
      </div>
    )
  }

  return (
    <div
      ref={dialogRef}
      className='fixed z-[50] shadow-lg border bg-background cursor-move overflow-hidden rounded-lg inline-block'
      style={{ top: `${position.y}px`, left: `${position.x}px` }}
      onMouseDown={handleMouseDown}
    >
      <div className='flex flex-col justify-evenly items-stretch w-full'>
        <div className='flex w-full md:flex-row justify-between items-center gap-4 md:gap-8 p-4 pb-3'>
          <div className='flex flex-col gap-1 items-start w-full md:w-auto'>
            <label htmlFor='from-version' className='text-sm font-medium ml-1'>
              From Version:
            </label>
            <Popover open={fromPopoverOpen} onOpenChange={setFromPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant='outline'
                  role='combobox'
                  aria-expanded={fromPopoverOpen}
                  className='flex justify-between items-center py-1 h-auto w-full'
                  disabled={isFetchingVersions || isComparing}
                >
                  {fromVersion ? (
                    <div className='flex flex-col items-start'>
                      <div className='flex items-center gap-1.5'>
                        <span className='text-sm font-medium'>
                          {fromVersion.tag
                            ? TAG_LABELS[fromVersion.tag] || fromVersion.tag
                            : ''}
                          {fromVersion === versions[0]
                            ? ' (Current Version)'
                            : ''}
                        </span>
                      </div>
                      <span className='text-xs text-muted-foreground'>
                        {format(
                          new Date(fromVersion.timestamp),
                          'MMM d, h:mm:ss a'
                        )}
                      </span>
                    </div>
                  ) : (
                    'Select version'
                  )}
                  <ChevronDownIcon className='ml-4 h-4 w-4 shrink-0' />
                </Button>
              </PopoverTrigger>
              <PopoverContent className='w-full p-0'>
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
                                  setFromPopoverOpen(false)
                                  handleVersionSelection(version, true)
                                }}
                              >
                                <div className='flex-1'>
                                  {formatSelectVersionLabel(
                                    version,
                                    version === versions[0]
                                  )}
                                </div>
                                <CheckIcon
                                  className={cn(
                                    'ml-3 h-4 w-4',
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
            {isFetchingVersions || isComparing || isExitingDiffMode ? (
              <ReloadIcon className='h-5 w-5 animate-spin text-muted-foreground' />
            ) : (
              <ArrowRightIcon className='h-5 w-5' />
            )}
          </div>

          <div className='flex flex-col gap-1 items-start w-full md:w-auto'>
            <label htmlFor='to-version' className='text-sm font-medium ml-1'>
              To Version:
            </label>
            <Popover open={toPopoverOpen} onOpenChange={setToPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant='outline'
                  role='combobox'
                  aria-expanded={toPopoverOpen}
                  className='flex justify-between items-center py-1 h-auto w-full'
                  disabled={isFetchingVersions || isComparing}
                >
                  {toVersion ? (
                    <div className='flex flex-col items-start'>
                      <div className='flex items-center gap-1.5'>
                        <span className='text-sm font-medium'>
                          {toVersion.tag
                            ? TAG_LABELS[toVersion.tag] || toVersion.tag
                            : ''}
                          {toVersion === versions[0]
                            ? ' (Current Version)'
                            : ''}
                        </span>
                      </div>
                      <span className='text-xs text-muted-foreground'>
                        {format(
                          new Date(toVersion.timestamp),
                          'MMM d, h:mm:ss a'
                        )}
                      </span>
                    </div>
                  ) : (
                    'Select version'
                  )}
                  <ChevronDownIcon className='ml-4 h-4 w-4 shrink-0' />
                </Button>
              </PopoverTrigger>
              <PopoverContent className='w-full p-0'>
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
                                  setToPopoverOpen(false)
                                  handleVersionSelection(version, false)
                                }}
                              >
                                <div className='flex-1'>
                                  {formatSelectVersionLabel(
                                    version,
                                    version === versions[0]
                                  )}
                                </div>
                                <CheckIcon
                                  className={cn(
                                    'ml-3 h-4 w-4',
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
    </div>
  )
}
