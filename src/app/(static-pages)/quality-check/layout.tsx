import { Metadata } from 'next'

import Footer from '@/components/footer'
import Navbar from '@/components/navbar'

export const metadata: Metadata = {
  title: "Scribie's Multi-Step Quality Check Process | 99%+ Accuracy",
  description: "Scribie's Multi-Step Quality Check Process | 99%+ Accuracy",
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
