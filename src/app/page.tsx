'use client'

import { useSession } from 'next-auth/react'

import BrevoChatWidget from '@/components/chat-widget'
import Footer from '@/components/footer'
import Navbar from '@/components/navbar'
import Achievments from '@/components/pages/home/achievments'
import Features from '@/components/pages/home/features'
import Hero from '@/components/pages/home/hero'
import Partners from '@/components/pages/home/partners'
import Pricing from '@/components/pages/home/pricing'
import Process from '@/components/pages/home/process'
import TranscriptionCategories from '@/components/pages/home/transcription-categories'

export default function Home() {
  const { data: session } = useSession()
  return (
    <>
      <Navbar />
      <Hero />
      <Partners />
      <TranscriptionCategories />
      <Pricing />
      <Achievments />
      <Process />
      <Features />
      <Footer />
      {(session?.user === undefined || session?.user?.role == 'CUSTOMER') && (
        <BrevoChatWidget />
      )}
    </>
  )
}
