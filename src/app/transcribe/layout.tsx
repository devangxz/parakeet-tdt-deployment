import Header from './components/header'
import { SidebarNav } from './components/sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'

export default function TranscribeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <TooltipProvider>
      <Header />
      <div className='grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]'>
        <div className='hidden border-r-2 border-customBorder md:block'>
          <div className='flex h-full max-h-screen flex-col gap-2'>
            <SidebarNav />
          </div>
        </div>
        <div className='flex flex-col'>{children}</div>
      </div>
    </TooltipProvider>
  )
}
