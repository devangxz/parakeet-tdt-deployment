import { TermsAndConditionsModal } from './terms-modal'
import { getMarkdownContent } from '@/lib/markdown'

interface TermsProviderProps {
  open: boolean
}

export async function TermsProvider({ open }: TermsProviderProps) {
  const { contentHtml } = await getMarkdownContent('terms-and-conditions')

  return <TermsAndConditionsModal open={open} contentHtml={contentHtml} />
}
