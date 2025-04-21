'use client'

import { ArrowRightIcon, ReloadIcon } from '@radix-ui/react-icons'
import { format, formatDistanceToNow } from 'date-fns'
import React, { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'

import { getFileVersionsAction, VersionInfo } from '@/app/actions/editor/get-version-diff'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface VersionCompareDialogProps {
  isOpen: boolean
  onClose: () => void
  fileId: string
  onCompare: (fromVersion: string, toVersion: string) => void
}

export default function VersionCompareDialog({
  isOpen,
  onClose,
  fileId,
  onCompare,
}: VersionCompareDialogProps) {
  const [versions, setVersions] = useState<VersionInfo[]>([])
  const [fromVersion, setFromVersion] = useState('')
  const [toVersion, setToVersion] = useState('')
  const [isFetchingVersions, setIsFetchingVersions] = useState(false)
  const [isComparing, setIsComparing] = useState(false)
  const [position, setPosition] = useState({ x: -500, y: 100 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchVersions = async () => {
      try {
        setIsFetchingVersions(true)
        const result = await getFileVersionsAction(fileId)
        
        if (result.success && result.versions && result.versions.length > 0) {
          setVersions(result.versions)
          
          // Set default selections if versions are available
          if (result.versions.length >= 2) {
            setFromVersion(result.versions[0].commitHash)
            setToVersion(result.versions[result.versions.length - 1].commitHash)
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
      console.log(position)
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

  // Add useEffect to position the dialog within the viewport when it opens
  useEffect(() => {
    if (isOpen && dialogRef.current) {
      // Set initial position to be centered within the viewport
      const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
      
      const dialogWidth = dialogRef.current.offsetWidth;
      
      // Position in the top right area of the editor
      setPosition({
        x: Math.max(20, vw - dialogWidth - 40),
        y: 100
      });
    }
  }, [isOpen]);

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
      <div className="flex flex-col md:flex-row justify-evenly items-start py-2 gap-4">
        <div className="flex flex-col gap-2 w-full md:w-auto">
          <label htmlFor="from-version" className="text-sm font-medium">
            From Version
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
            <Select
              value={fromVersion}
              onValueChange={setFromVersion}
              disabled={isFetchingVersions}
            >
              <SelectTrigger id="from-version" className="cursor-pointer">
                <SelectValue placeholder="Select version" />
              </SelectTrigger>
              <SelectContent>
                {versions.map((version) => (
                  <SelectItem
                    key={`from-${version.commitHash}`}
                    value={version.commitHash}
                  >
                    {formatVersionLabel(version)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="hidden md:flex items-center justify-center mt-7">
          <ArrowRightIcon className="h-5 w-5" />
        </div>

        <div className="flex flex-col gap-2 w-full md:w-auto">
          <label htmlFor="to-version" className="text-sm font-medium">
            To Version
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
            <Select 
              value={toVersion} 
              onValueChange={setToVersion}
              disabled={isFetchingVersions}
            >
              <SelectTrigger id="to-version" className="cursor-pointer">
                <SelectValue placeholder="Select version" />
              </SelectTrigger>
              <SelectContent>
                {versions.map((version) => (
                  <SelectItem
                    key={`to-${version.commitHash}`}
                    value={version.commitHash}
                  >
                    {formatVersionLabel(version)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
          className="w-full md:w-auto mt-2 md:mt-7 cursor-pointer"
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