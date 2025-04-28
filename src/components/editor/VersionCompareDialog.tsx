'use client'

import { ArrowRightIcon, ReloadIcon, CheckIcon, ChevronDownIcon } from '@radix-ui/react-icons'
import { format, formatDistanceToNow } from 'date-fns'
import React, { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'

import { getFileVersionsAction, VersionInfo } from '@/app/actions/editor/get-version-diff'
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

interface VersionCompareDialogProps {
  isOpen: boolean
  onClose: () => void
  fileId: string
  onCompare: (fromVersion: Options, toVersion: Options) => void
}

export interface Options {
  versionKey: string
  tag: string
  isCommitHash: boolean
}

export default function VersionCompareDialog({
  isOpen,
  onClose,
  fileId,
  onCompare,
}: VersionCompareDialogProps) {
  const [versions, setVersions] = useState<VersionInfo[]>([])
  const [fromVersion, setFromVersion] = useState<Options>({ versionKey: '', tag: '', isCommitHash: false })
  const [toVersion, setToVersion] = useState<Options>({ versionKey: '', tag: '', isCommitHash: false })
  const [isFetchingVersions, setIsFetchingVersions] = useState(false)
  const [isComparing, setIsComparing] = useState(false)
  const [position, setPosition] = useState({ x: 10, y: 100 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const dialogRef = useRef<HTMLDivElement>(null)
  const [fromPopoverOpen, setFromPopoverOpen] = useState(false)
  const [toPopoverOpen, setToPopoverOpen] = useState(false)
  const [searchFrom, setSearchFrom] = useState<string>('')
  const [searchTo, setSearchTo] = useState<string>('')

  useEffect(() => {
    const fetchVersions = async () => {
      try {
        setIsFetchingVersions(true)
        const result = await getFileVersionsAction(fileId)
        
        if (result.success && result.versions && result.versions.length > 0) {
          setVersions(result.versions)
          
          // Set default selections if versions are available
          if (result.versions.length >= 1) {
            const getFromVersion = getVersionIdentifier(result.versions[result.versions.length - 1])
            const getToVersion = getVersionIdentifier(result.versions[0])
            setFromVersion(getFromVersion)
            setToVersion(getToVersion)
          }
        } else {
          toast.error(result.message || 'No versions found')
          setVersions([])
        }
      } catch (error) {
        setVersions([])
        toast.error('Failed to fetch versions')
      } finally {
        setIsFetchingVersions(false)
      }
    }

    if (isOpen && fileId) {
      fetchVersions()
    }
  }, [isOpen, fileId])

  // Reset search inputs when dialog opens
  useEffect(() => {
    if (isOpen) {
      setSearchFrom('')
      setSearchTo('')
    }
  }, [isOpen])

  const getVersionIdentifier = (version: VersionInfo): Options => {
    if (version.tag && version.s3VersionId) {
      return {versionKey: version.s3VersionId, tag: version.tag, isCommitHash: false};
    }
    return {versionKey: version.commitHash, tag: version.tag as string, isCommitHash: true};
  }

  // Set up drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (dialogRef.current && !e.defaultPrevented) {
      // Don't start dragging if the user clicked on a form control
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'BUTTON' || 
        target.tagName === 'SELECT' || 
        target.tagName === 'INPUT' ||
        target.closest('[role="combobox"]') || 
        target.closest('[role="option"]')
      ) {
        return;
      }

      setIsDragging(true);
      const rect = dialogRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  const handleMouseMove = (ev: globalThis.MouseEvent) => {
    if (isDragging && dialogRef.current) {
      ev.preventDefault();
      const newX = Math.max(0, ev.clientX - dragOffset.x);
      const newY = Math.max(0, ev.clientY - dragOffset.y);
      
      // Constrain to window bounds
      const maxX = window.innerWidth - dialogRef.current.offsetWidth;
      const maxY = window.innerHeight - dialogRef.current.offsetHeight;
      
      setPosition({
        x: Math.min(newX, maxX),
        y: Math.min(newY, maxY)
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Add event listeners for dragging
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isOpen, isDragging]);

  const handleCompare = async () => {
    if (!fromVersion || !toVersion) {
      toast.error('Please select both versions to compare')
      return
    }

    if (fromVersion === toVersion) {
      toast.error('Please select different versions to compare')
      return
    }

    setIsComparing(true)
    try {
      onCompare(fromVersion, toVersion)
      onClose()
    } catch (error) {
      toast.error('Error comparing versions')
    } finally {
      setIsComparing(false)
    }
  }

  // Helper function to format version label with tag if available
  const formatVersionLabel = (version: VersionInfo) => {
    const timeFormatted = format(new Date(version.timestamp), 'MMM d, h:mm a')
    const timeAgo = formatDistanceToNow(new Date(version.timestamp), { addSuffix: true })
    
    return version.tag 
      ? `${timeFormatted} - ${version.tag} (${timeAgo})`
      : `${timeFormatted} (${timeAgo})`
  }

  const formatSelectVersionLabel = (version: VersionInfo) => {
    const timeFormatted = format(new Date(version.timestamp), 'MMM d, h:mm a')
    const timeAgo = formatDistanceToNow(new Date(version.timestamp), { addSuffix: true })
    
    return (
      <div className="flex flex-col gap-1 items-start">
        <span className="text-sm text-muted-foreground">{timeFormatted}</span>
        <span className="text-sm text-muted-foreground">{version.tag ? `${version.tag}` : ''}{' '}({timeAgo})</span>
      </div>
    )
  }

  return (
    <div
      ref={dialogRef}
      className={`${
        !isOpen ? 'hidden' : ''
      } fixed z-[50] rounded-lg shadow-lg border bg-background p-4 cursor-move`}
      style={{
        top: `${position.y}px`,
        left: `${position.x}px`,
      }}
      onMouseDown={handleMouseDown}
    > 
      <div className="flex flex-col md:flex-row justify-evenly items-center py-2 gap-4">
        <div className="flex flex-row gap-2 items-center w-full md:w-auto">
          <label htmlFor="from-version" className="text-sm font-medium items-center">
            From Version: 
          </label>
          {isFetchingVersions ? (
            <div className="flex items-center gap-2">
              <ReloadIcon className="h-4 w-4 animate-spin" />
              <span className="text-sm text-muted-foreground">Loading versions...</span>
            </div>
          ) : versions.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No versions found
            </div>
          ) : (
            <Popover open={fromPopoverOpen} onOpenChange={setFromPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={fromPopoverOpen}
                  className="flex justify-between"
                  disabled={isFetchingVersions}
                >
                  {fromVersion.versionKey
                    ? formatVersionLabel(versions.find(v => 
                        v.s3VersionId === fromVersion.versionKey || 
                        v.commitHash === fromVersion.versionKey
                      ) as VersionInfo)
                    : "Select version"}
                  <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0">
                <Command>
                  <CommandInput 
                    placeholder="Search versions..."  
                    value={searchFrom}
                    onValueChange={setSearchFrom}
                  />
                  <CommandList>
                    <ScrollArea className="h-72">
                      <CommandEmpty>No version found</CommandEmpty>
                      <CommandGroup>
                        {versions
                          .filter(version => 
                            searchFrom === '' || 
                            formatVersionLabel(version).toLowerCase().includes(searchFrom.toLowerCase())
                          )
                          .map((version) => (
                            <CommandItem
                              key={version.s3VersionId || version.commitHash}
                              value={formatVersionLabel(version)}
                              onSelect={() => {
                                setFromVersion(getVersionIdentifier(version));
                                setFromPopoverOpen(false);
                              }}
                            >
                              <div className="flex-1">{formatSelectVersionLabel(version)}</div>
                              <CheckIcon
                                className={cn(
                                  "ml-2 h-4 w-4",
                                  (version.s3VersionId === fromVersion.versionKey || 
                                   version.commitHash === fromVersion.versionKey)
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </ScrollArea>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          )}
        </div>

        <div className="hidden md:flex items-center justify-center">
          <ArrowRightIcon className="h-5 w-5" />
        </div>

        <div className="flex flex-row gap-2 w-full md:w-auto items-center">
          <label htmlFor="to-version" className="text-sm font-medium">
            To Version: 
          </label>
          {isFetchingVersions ? (
            <div className="flex items-center gap-2">
              <ReloadIcon className="h-4 w-4 animate-spin" />
              <span className="text-sm text-muted-foreground">Loading versions...</span>
            </div>
          ) : versions.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No versions found
            </div>
          ) : (
            <Popover open={toPopoverOpen} onOpenChange={setToPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={toPopoverOpen}
                  className="flex justify-between"
                  disabled={isFetchingVersions}
                >
                  {toVersion.versionKey
                    ? formatVersionLabel(versions.find(v => 
                        v.s3VersionId === toVersion.versionKey || 
                        v.commitHash === toVersion.versionKey
                      ) as VersionInfo)
                    : "Select version"}
                  <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0">
                <Command>
                  <CommandInput 
                    placeholder="Search versions..." 
                    value={searchTo}
                    onValueChange={setSearchTo}
                  />
                  <CommandList>
                    <ScrollArea className="h-72">
                      <CommandEmpty>No version found</CommandEmpty>
                      <CommandGroup>
                        {versions
                          .filter(version => 
                            searchTo === '' || 
                            formatVersionLabel(version).toLowerCase().includes(searchTo.toLowerCase())
                          )
                          .map((version) => (
                            <CommandItem
                              key={version.s3VersionId || version.commitHash}
                              value={formatVersionLabel(version)}
                              onSelect={() => {
                                setToVersion(getVersionIdentifier(version));
                                setToPopoverOpen(false);
                              }}
                            >
                              <div className="flex-1">{formatSelectVersionLabel(version)}</div>
                              <CheckIcon
                                className={cn(
                                  "ml-2 h-4 w-4",
                                  (version.s3VersionId === toVersion.versionKey || 
                                   version.commitHash === toVersion.versionKey)
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </ScrollArea>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          )}
        </div>

        <Button
          onClick={handleCompare}
          disabled={
            isComparing || 
            isFetchingVersions || 
            versions.length < 2 || 
            !fromVersion || 
            !toVersion
          }
          className="w-full md:w-auto"
        >
          {isComparing ? (
            <>
              <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
              Comparing...
            </>
          ) : (
            <div className="flex items-center gap-2">
              Compare
            </div>
          )}
        </Button>
      </div>
    </div>
  )
} 