'use client'

import { MagnifyingGlassIcon } from '@radix-ui/react-icons'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import {
  getActiveQCsAndReviewers,
  type QCReviewer,
} from '@/app/actions/om/get-active-qcs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface QCReviewerSelectProps {
  value: string
  onChange: (email: string) => void
  disabled?: boolean
  triggerOnLoad?: boolean
  placeholder?: string
  onlyReviewers?: boolean
}

export function QCReviewerSelect({
  value,
  onChange,
  disabled = false,
  triggerOnLoad = true,
  placeholder = 'Select an Editor...',
  onlyReviewers = false,
}: QCReviewerSelectProps) {
  const [open, setOpen] = useState(false)
  const [fetchingQCs, setFetchingQCs] = useState(false)
  const [activeQCs, setActiveQCs] = useState<QCReviewer[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Fetch data when component mounts
  useEffect(() => {
    let isMounted = true

    const fetchQCs = async () => {
      if (triggerOnLoad || open) {
        setFetchingQCs(true)
        try {
          const result = await getActiveQCsAndReviewers(onlyReviewers)
          if (result.success && isMounted && Array.isArray(result.data)) {
            setActiveQCs(result.data)
          } else if (isMounted) {
            console.error('Data is not an array or request failed:', result)
            setActiveQCs([])
            toast.error('Failed to fetch QCs and Reviewers')
          }
        } catch (error) {
          console.error('Error fetching QCs:', error)
          if (isMounted) {
            setActiveQCs([])
            toast.error('Error fetching QCs and Reviewers')
          }
        } finally {
          if (isMounted) {
            setFetchingQCs(false)
          }
        }
      }
    }

    fetchQCs()

    return () => {
      isMounted = false
    }
  }, [triggerOnLoad, open])

  const getDisplayName = (qc: QCReviewer) => {
    const name = [qc.firstname, qc.lastname].filter(Boolean).join(' ')
    return name ? `${name} (${qc.email})` : qc.email
  }

  // Find the selected QC for display
  const selectedQC =
    value && activeQCs.length > 0
      ? activeQCs.find((qc) => qc.email === value)
      : null

  const displayValue = selectedQC ? getDisplayName(selectedQC) : value || ''

  // Filter QCs based on search query
  const filteredQCs = activeQCs.filter((qc) => {
    const searchText = searchQuery.toLowerCase()
    const name = [qc.firstname, qc.lastname]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return (
      qc.email.toLowerCase().includes(searchText) || name.includes(searchText)
    )
  })

  return (
    <div className='relative w-full' ref={dropdownRef}>
      <Button
        type='button'
        variant='order'
        className='w-full justify-between text-left font-normal not-rounded'
        disabled={disabled || fetchingQCs}
        onClick={() => setOpen(!open)}
      >
        {value ? displayValue : fetchingQCs ? 'Loading...' : placeholder}
      </Button>

      {open && (
        <div className='absolute z-50 w-full mt-1 bg-white rounded-md border border-gray-200 shadow-lg'>
          <div className='flex items-center px-3 py-2 border-b'>
            <MagnifyingGlassIcon className='mr-2 h-4 w-4 shrink-0 opacity-50' />
            <Input
              placeholder='Search by name or email...'
              className='h-8 w-full border-0 bg-transparent p-0 text-sm focus-visible:ring-0 focus-visible:ring-offset-0'
              onChange={(e) => setSearchQuery(e.target.value)}
              value={searchQuery}
            />
          </div>
          <div className='max-h-[300px] overflow-auto p-1'>
            {filteredQCs.length > 0 ? (
              filteredQCs.map((qc) => (
                <div
                  key={qc.id}
                  className={cn(
                    'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground',
                    value === qc.email && 'bg-accent text-accent-foreground'
                  )}
                  onClick={() => {
                    onChange(qc.email)
                    setOpen(false)
                    setSearchQuery('')
                  }}
                >
                  {getDisplayName(qc)}
                </div>
              ))
            ) : fetchingQCs ? (
              <div className='text-center py-2 text-sm text-gray-500'>
                Loading...
              </div>
            ) : (
              <div className='text-center py-2 text-sm text-gray-500'>
                No editors found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
