import { Metadata } from 'next'
import './globals.css'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { Toaster } from 'sonner'

import AuthProvider from './context/AuthProvider'
import ImportServiceProvider from './context/ImportServiceProvider'
import UploadProvider from './context/UploadProvider'
import UploadProgress from '@/app/(dashboard)/files/upload/components/UploadProgress'
import { ThemeProvider } from '@/components/theme-provider'
import { cn } from '@/lib/utils'

const plusJakarta = Plus_Jakarta_Sans({ 
  subsets: ['latin'],
  variable: '--font-plus-jakarta',
  weight: ['400', '500', '600', '700']
})

export const metadata: Metadata = {
  title: 'Scribie - Industry-Leading Transcription Services | Audio & Video to Text',
  icons: '/assets/images/logo.svg',
  description: "Scribie's transcription services turn your recordings into accurate text. From legal depositions to marketing focus groups, we provide precise transcripts in custom formats. Try our fast, reliable service today.",
  keywords:
    'transcription, transcribe audio to text, transcribe sound to text, transcribe audio recording to text, scribie transcription, transcription services, audio transcription, video transcription, online transcription, transcribe video to text, human verified transcription',
}

export default function RootLayout({
  children,
  params: { locale },
}: Readonly<{
  children: React.ReactNode
  params: { locale: string }
}>) {
  return (
    <html lang={locale} className={cn(plusJakarta.variable, plusJakarta.className)}>
      <body className={cn(`bg-background min-h-screen font-sans antialiased`)}>
        <AuthProvider>
          <UploadProvider>
            <ImportServiceProvider>
              <ThemeProvider
                attribute='class'
                defaultTheme='light'
                enableSystem
                disableTransitionOnChange
              >
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
