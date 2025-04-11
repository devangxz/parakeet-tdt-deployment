import { Metadata } from 'next'

import Footer from '@/components/footer'
import Navbar from '@/components/navbar'

export const metadata: Metadata = {
  title: 'Join Scribie as a Freelance Transcriber | Remote Opportunities',
  description: 'Join Scribie as a Freelance Transcriber | Remote Opportunities',
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
