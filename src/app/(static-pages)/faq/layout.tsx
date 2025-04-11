import { Metadata } from 'next'

import Footer from '@/components/footer'
import Navbar from '@/components/navbar'

export const metadata: Metadata = {
  title: 'Frequently Asked Questions | Scribie Transcription Services',
  description: 'Frequently Asked Questions | Scribie Transcription Services',
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <section>
      <Navbar />
      {children}
      <Footer />
    </section>
  )
}
