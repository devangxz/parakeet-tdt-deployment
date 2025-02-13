import {
  DashboardSideBar,
  DashboardSideBarItemType,
} from './dashboard-sidebard'
import AuthenticatedFooter from '../authenticated-footer/index'
import PaymentsNavbar from '../navbar/payments'

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
  <div className='flex min-h-screen flex-col'>
    <PaymentsNavbar />
    <div className='space-y-0.5 border-b-2 border-customBorder px-2 lg:px-4 pt-3 pb-4'>
      <h1 className='text-2xl font-bold'>{title}</h1>
      <p className='text-muted-foreground'>{subtitle}</p>
    </div>
    <div className='flex flex-1'>
      <div className='hidden border-r-2 border-customBorder md:block md:w-[220px] lg:w-[280px]'>
        <aside className='sticky top-[69.5px]'>
          <DashboardSideBar
            sidebarItems={sidebarItems as DashboardSideBarItemType[]}
          />
        </aside>
      </div>
      <main className='flex-1'>
        <div className='h-full'>{children}</div>
      </main>
    </div>
    <AuthenticatedFooter />
  </div>
)

export default DashboardPlaceholder
