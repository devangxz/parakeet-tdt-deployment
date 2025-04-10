import { Metadata } from 'next'

import Footer from '@/components/footer'
import Navbar from '@/components/navbar'

export const metadata: Metadata = {
  title: 'About Scribie | AI-Powered Transcription Services',
  description: 'Learn more about Scribie and our transcription services',
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <section className='h-screen'>
      <Navbar />
      {children}
      <Footer />
    </section>
  )
}
