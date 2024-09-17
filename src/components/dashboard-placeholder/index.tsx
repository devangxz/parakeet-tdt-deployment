import {
  DashboardSideBar,
  DashboardSideBarItemType,
} from './dashboard-sidebard'
import AuthenticatedFooter from '../authenticated-footer/index'
import PaymentsNavbar from '../navbar/payments'
import { Separator } from '@/components/ui/separator'

interface DashboardPlaceholderProps {
  children: React.ReactNode
  sidebarItems?: DashboardSideBarItemType[]
  title: string
  subtitle: string
}

const DashboardPlaceholder = ({
  children,
  sidebarItems,
  title,
  subtitle,
}: DashboardPlaceholderProps) => (
  <>
    <PaymentsNavbar />
    <div className='w-[100%] min-h-screen m-auto my-8 px-2 lg:px-4'>
      <div className='space-y-0.5'>
        <h2 className='text-2xl font-bold tracking-tight'>{title}</h2>
        <p className='text-muted-foreground'>{subtitle}</p>
      </div>
      <Separator className='my-6' />
      <div className='flex flex-col space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0'>
        <aside className='lg:w-[250px]'>
          <DashboardSideBar
            sidebarItems={sidebarItems as DashboardSideBarItemType[]}
          />
        </aside>
        <div className='flex-1'>{children}</div>
      </div>
    </div>
    <AuthenticatedFooter />
  </>
)

export default DashboardPlaceholder
