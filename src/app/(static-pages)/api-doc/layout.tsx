import { Metadata } from 'next'

import Footer from '@/components/footer'
import Navbar from '@/components/navbar'

export const metadata: Metadata = {
  title: 'Scribie API Documentation | Integrate Transcription Solutions',
  description: 'Scribie API Documentation | Integrate Transcription Solutions',
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
