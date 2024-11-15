'use client'
import { useSession } from 'next-auth/react'

import BrevoChatWidget from '@/components/chat-widget'
import Footer from '@/components/footer'
import Navbar from '@/components/navbar'
import Hero from '@/components/pages/home/hero'
import Partner from '@/components/pages/home/partner'
import Pricing from '@/components/pages/home/pricing'
import Testimonials from '@/components/pages/home/testimonials'
import TranscriptionCategories from '@/components/pages/home/transcription-categories'

export default function Home() {
  const { data: session } = useSession()
  return (
    <>
      <Navbar />
      <Hero />
      <TranscriptionCategories />
      <Pricing />
      <Testimonials />
      <Partner />
      <Footer />
      {(session?.user === undefined || session?.user?.role == 'CUSTOMER') && (
        <BrevoChatWidget />
      )}
    </>
  )
}
