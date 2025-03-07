import { Metadata } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import { Toaster } from 'sonner'

import AuthProvider from './context/AuthProvider'
import ImportServiceProvider from './context/ImportServiceProvider'
import UploadProvider from './context/UploadProvider'
import UploadProgress from '@/app/(dashboard)/files/upload/components/UploadProgress'
import GoogleAnalyticsHandler from '@/components/google-handler'
import { ThemeProvider } from '@/components/theme-provider'
import { cn } from '@/lib/utils'

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta',
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title:
    'Scribie provides Accurate & Affordable Human-Verified Transcription Services',
  icons: '/assets/images/logo.svg',
  description:
    'Get 99% accurate, human-verified transcripts with fast delivery from Scribie. Convert deposition/podcast/marketing content to text starting at $0.50 per minute.',
  keywords:
    'transcription, transcribe audio to text, transcribe sound to text, transcribe audio recording to text, scribie transcription, transcription services, audio transcription, video transcription, online transcription, transcribe video to text, human verified transcription, transcribe for youtube,transcribe audio to text, transcribe sound to text,transcribe audio into text,audio to text transcription,video transcribers,video transcription,audio transcription,transcription services,transcribe audio recording to text',
}

export default function RootLayout({
  children,
  params: { locale },
}: Readonly<{
  children: React.ReactNode
  params: { locale: string }
}>) {
  return (
    <html
      lang={locale}
      className={cn(plusJakarta.variable, plusJakarta.className)}
    >
      <body className={cn(`bg-background min-h-screen font-sans antialiased`)}>
        <Script
          src='https://www.googletagmanager.com/gtag/js?id=G-P369LKS7ND'
          strategy='afterInteractive'
        />
        <Script id='google-analytics' strategy='afterInteractive'>
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            
            gtag('config', 'G-P369LKS7ND', {
              page_path: window.location.pathname,
            });
          `}
        </Script>

        <AuthProvider>
          <UploadProvider>
            <ImportServiceProvider>
              <ThemeProvider
                attribute='class'
                defaultTheme='light'
                enableSystem
                disableTransitionOnChange
              >
                <GoogleAnalyticsHandler />
                {children}
                <Toaster richColors position='top-center' />
                <UploadProgress />
              </ThemeProvider>
            </ImportServiceProvider>
          </UploadProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
