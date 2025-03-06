import Header from './components/header'
import { SidebarNav } from './components/sidebar'
import { TermsAndConditionsModal } from './components/terms-modal'
import { checkSignOffStatus } from '@/app/actions/transcriber/accept-terms'
import AuthenticatedFooter from '@/components/authenticated-footer'
import { TooltipProvider } from '@/components/ui/tooltip'

export default async function TranscribeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const hasAcceptedTerms = await checkSignOffStatus()

  return (
    <TooltipProvider>
      <div className='flex min-h-screen flex-col'>
        <Header />
        <div className='flex flex-1'>
          <div className='hidden border-r-2 border-customBorder md:block md:w-[220px] lg:w-[280px]'>
            <aside className='sticky top-[69.5px]'>
              <SidebarNav />
            </aside>
          </div>
          <main className='flex-1'>
            <div className='h-full'>{children}</div>
          </main>
        </div>
        <AuthenticatedFooter />
        <TermsAndConditionsModal open={!hasAcceptedTerms} />
      </div>
    </TooltipProvider>
  )
}
