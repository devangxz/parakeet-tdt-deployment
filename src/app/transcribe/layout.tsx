import { TranscribeLayoutClient } from './components/layout-client'
import { TermsProvider } from './components/terms-provider'
import { checkSignOffStatus } from '@/app/actions/transcriber/accept-terms'

export default async function TranscribeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const hasAcceptedTerms = await checkSignOffStatus()

  return (
    <>
      <TranscribeLayoutClient>{children}</TranscribeLayoutClient>
      <TermsProvider open={!hasAcceptedTerms} />
    </>
  )
}
