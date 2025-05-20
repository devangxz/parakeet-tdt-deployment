import { getMarkdownContent } from '@/lib/markdown'

export const metadata = {
  title: 'Terms and Conditions | Scribie',
  description: 'Terms and conditions for using Scribie services',
}

export default async function TermsPage() {
  const { contentHtml } = await getMarkdownContent('terms-and-conditions')

  return (
    <div className='container mx-auto py-12 px-4 md:px-6'>
      <div className='max-w-6xl mx-auto bg-white rounded-lg shadow-sm p-6 md:p-8'>
        <header className='text-center'>
          <h1 className='text-4xl md:text-5xl lg:text-6xl font-bold text-foreground max-w-3xl lg:max-w-5xl mx-auto leading-tight md:leading-[1.3] lg:leading-[1.1]'>
            Terms & Conditions
          </h1>
          <p className='mt-4 sm:mt-6 lg:mt-8 text-muted-foreground max-w-sm sm:max-w-xl lg:max-w-2xl mx-auto text-base sm:text-lg'>
            Version 1.1
          </p>
        </header>
        <article className='markdown-content'>
          <div dangerouslySetInnerHTML={{ __html: contentHtml }} />
        </article>
      </div>
    </div>
  )
}
