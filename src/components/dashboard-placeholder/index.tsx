import {
  DashboardSideBar,
  DashboardSideBarItemType,
} from './dashboard-sidebard'
import AuthenticatedFooter from '../authenticated-footer/index'
import PaymentsNavbar from '../navbar/payments'
import { cn } from '@/lib/utils'
interface DashboardPlaceholderProps {
  children: React.ReactNode
  sidebarItems?: DashboardSideBarItemType[]
  title: string
  subtitle: string
  setIsExpanded: (isExpanded: boolean) => void
  isExpanded: boolean
  toggleSidebar: () => void
  menuButtonRef: React.RefObject<HTMLDivElement>
  sidebarRef: React.RefObject<HTMLDivElement>
}

const DashboardPlaceholder = ({
  children,
  sidebarItems,
  title,
  subtitle,
  setIsExpanded,
  isExpanded,
  toggleSidebar,
  menuButtonRef,
  sidebarRef,
}: DashboardPlaceholderProps) => (
  <div className='flex min-h-screen flex-col'>
    <PaymentsNavbar toggleSidebar={toggleSidebar} menuButtonRef={menuButtonRef}/>
    <div className='space-y-0.5 border-b-2 border-customBorder px-2 lg:px-4 pt-3 pb-4'>
      <h1 className='text-2xl font-bold'>{title}</h1>
      <p className='text-muted-foreground'>{subtitle}</p>
    </div>
    <div className='flex flex-1 relative'>
      <div 
        ref={sidebarRef}
        className={cn(
          'fixed top-[69.5px] bottom-0 left-0 z-50 lg:relative lg:top-0 lg:h-auto lg:z-10 border-r-2 border-customBorder bg-background transition-all duration-300 ease-in-out', 
          isExpanded ? 'w-[60vw] lg:w-72' : 'w-0 overflow-hidden'
        )}>
        <aside>
          <DashboardSideBar
            sidebarItems={sidebarItems as DashboardSideBarItemType[]}
            setIsExpanded={setIsExpanded}
          />
        </aside>
      </div>
      <main className={cn('flex-1 transition-all duration-300 ease-in-out')}>
        <div className='h-full'>{children}</div>
      </main>
    </div>
    <AuthenticatedFooter />
  </div>
)

export default DashboardPlaceholder
