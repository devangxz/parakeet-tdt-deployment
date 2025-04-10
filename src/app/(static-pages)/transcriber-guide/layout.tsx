import { Metadata } from 'next'

import Footer from '@/components/footer'
import Navbar from '@/components/navbar'

export const metadata: Metadata = {
  title: 'Transcriber Guidelines | Best Practices for at Scribie',
  description: 'Transcriber Guidelines | Best Practices for at Scribie',
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
