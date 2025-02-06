'use client'
import { Database, Settings, ChevronDown, Folder } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { useState, useEffect } from 'react'

import { getCreditBalanceAction } from '@/app/actions/credit-balance'
import { getAllFolderTreeAction } from '@/app/actions/folders/getAllFolderTree'
import TeamSwitcher from '@/components/team-switcher'
import { SidebarItemType } from '@/types/sidebar'

interface SidebarProps {
  sidebarItems: SidebarItemType[]
  showTeams?: boolean
  heading?: string
}

const Sidebar = ({
  sidebarItems,
  showTeams = true,
  heading = 'Files',
}: SidebarProps) => {
  const pathname = usePathname()
  const [creditsBalance, setCreditsBalance] = useState(0)
  const fetchCreditsBalance = async () => {
    try {
      const response = await getCreditBalanceAction()
      if (response.success && response.creditsBalance) {
        setCreditsBalance(response.creditsBalance)
      }
    } catch (err) {
      console.error('Failed to fetch credits balance:', err)
    }
  }

  useEffect(() => {
    fetchCreditsBalance()
  }, [])

  return (
    <div className={`flex flex-col`}>
      <nav className="flex-1 overflow-hidden">
        <div className="h-full px-2 lg:px-4 py-4">
          {showTeams && (
            <div className="pb-5 border-b-2 border-customBorder truncate">
              <h2 className="mb-2.5 text-lg font-semibold tracking-tight">Teams</h2>
              <TeamSwitcher />
            </div>
          )}

          <div className="py-3 border-b-2 border-customBorder overflow-y-auto">
            <SidebarItems
              sidebarItems={sidebarItems}
              heading={heading}
              pathname={pathname || ''}
            />
          </div>

          <div className='pt-3'>
            <h2 className='mb-2.5 text-lg font-semibold tracking-tight'>More</h2>
            <Link
              href='/settings/credits'
              className={`flex items-center gap-2.5 px-3 pt-1 pb-2 transition-all hover:text-primary`}
            >
              <Database className='h-5 w-5' />
              Credits
              <div className='ml-auto flex items-center' test-id='credit-balance'>
                <p className='font-normal mr-1'>${creditsBalance}</p>
                <ChevronDown className='h-5 w-5 -rotate-90 font-normal' />
              </div>
            </Link>
            <Link
              href='/settings/personal-info'
              className={`flex items-center gap-2.5 px-3 py-1.5 transition-all hover:text-primary`}
            >
              <Settings className='h-5 w-5' />
              Settings
              <ChevronDown className='h-5 w-5 ml-auto flex -rotate-90 font-normal' />
            </Link>
          </div>
        </div>
      </nav>
    </div >
  )
}

export default Sidebar

export type props = {
  sidebarItems: SidebarItemType[]
  heading: string
  pathname: string
}

interface FileNode {
  name: string
  children: FileNode[]
  parentId?: number | null
  id: number
}

const FileTreeNode = ({ data, expandedNodes, setExpandedNodes }: {
  data: FileNode;
  expandedNodes: Record<string, boolean>;
  setExpandedNodes: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}) => {
  const isOpen = expandedNodes[data.id]
  const hasChildren = data.children && data.children.length > 0

  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1 pr-2 hover:bg-accent/50 rounded-md">
        <button
          onClick={() => {
            if (hasChildren) {
              setExpandedNodes(prev => ({
                ...prev,
                [data.id]: !prev[data.id],
              }))
            }
          }}
          className="p-2 shrink-0"
        >
          <ChevronDown
            className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-0' : '-rotate-90'}`}
          />
        </button>
        <div className="flex items-center gap-2 py-1 min-w-0 flex-1">
          <Folder className="h-4 w-4 shrink-0" />
          <Link
            href={`/files/all-files?folderId=${data.id}`}
            className="text-sm truncate block w-full hover:text-primary"
          >
            {data.name}
          </Link>
        </div>
      </div>
      {isOpen && hasChildren && (
        <div className="pl-3">
          {data.children?.map((child, index) => (
            <FileTreeNode
              key={`${child.name}-${index}`}
              data={child}
              expandedNodes={expandedNodes}
              setExpandedNodes={setExpandedNodes}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function SidebarItems(props: props) {
  const { heading, sidebarItems, pathname } = props
  const [expandedNodes, setExpandedNodes] = useState<Record<number, boolean>>({})
  const [rootFolders, setRootFolders] = useState<FileNode[]>([])
  const [isRootExpanded, setIsRootExpanded] = useState(false)

  useEffect(() => {
    const fetchFolders = async () => {
      try {
        const response = await getAllFolderTreeAction()
        if (response.success && response.data) {
          setRootFolders(response.data)
        }
      } catch (err) {
        console.error('Failed to fetch folders:', err)
      }
    }
    fetchFolders()
  }, [])

  return (
    <>
      <div className={`${isRootExpanded ? 'h-[calc(100vh-24rem)]' : ''}  overflow-y-auto`}>

        <h2 className='mb-2.5 text-lg font-semibold tracking-tight'>{heading}</h2>

        {sidebarItems.map((item, index) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          const isAllFiles = item.href === '/files/all-files'

          if (isAllFiles) {
            return (
              <div key={index}>
                <div
                  className={`flex items-center rounded-lg transition-all ${isActive ? 'text-primary bg-primary/10' : 'hover:text-primary'
                    }`}
                >
                  <button
                    onClick={() => setIsRootExpanded(prev => !prev)}
                    className="px-3 py-2 shrink-0"
                  >
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${isRootExpanded ? 'rotate-0' : '-rotate-90'
                        }`}
                    />
                  </button>
                  <Link
                    href={item.href}
                    className="flex-1 flex items-center gap-2.5 py-2 pr-3 min-w-0"
                  >
                    <span className="truncate">{item.name}</span>
                  </Link>
                </div>
                {isRootExpanded && (
                  <div className="pl-3">
                    {rootFolders.map((folder, index) => (
                      <FileTreeNode
                        key={`${folder.id}-${index}`}
                        data={folder}
                        expandedNodes={expandedNodes}
                        setExpandedNodes={setExpandedNodes}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          }

          return (
            <Link
              key={index}
              href={item.href}
              className={`flex items-center gap-2.5 rounded-md px-3 py-2 transition-all ${isActive ? 'text-primary bg-primary/10' : 'hover:text-primary'
                }`}
            >
              <Icon className='h-5 w-5' />
              {item.name}
              {item.badgeCount !== undefined && (
                <p className='ml-auto flex font-normal mr-1'>{item.badgeCount}</p>
              )}
            </Link>
          )
        })}
      </div>
    </>
  )
}
