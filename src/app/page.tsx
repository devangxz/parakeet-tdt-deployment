'use client'

import dynamic from 'next/dynamic'
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

const Motd = dynamic(
  async () => {
    const { useState, useEffect } = await import('react')
    function MotdClient() {
      const [showMotd, setShowMotd] = useState(false)
      const [slideIn, setSlideIn] = useState(false)

      useEffect(() => {
        if (!localStorage.getItem('motdDismissedFlag')) {
          setShowMotd(true)
          setTimeout(() => setSlideIn(true), 10)
        }
      }, [])

      function handleClose() {
        setSlideIn(false)
        setTimeout(() => {
          setShowMotd(false)
          localStorage.setItem('motdDismissedFlag', 'true')
        }, 300)
      }

      if (!showMotd) return null

      return (
        <div
          className={`fixed top-0 inset-x-0 z-50 transform transition-transform duration-300 ease-out ${
            slideIn ? 'translate-y-0' : '-translate-y-full'
          } bg-primary/80`}
        >
          <div className='mx-auto px-10 py-2 flex items-center justify-between'>
            <span className='text-white'>
              Scribie.com and scribie.ai are managed by the same team now. We
              will be migrating users from scribie.com to scribie.ai soon to
              leverage enhanced AI features and an improved experience.
            </span>
            <button
              className='text-white hover:text-gray-300'
              onClick={handleClose}
              aria-label='Close message'
            >
              ✕
            </button>
          </div>
        </div>
      )
    }
    return MotdClient
  },
  { ssr: false }
)

export default function Home() {
  const { data: session } = useSession()
  return (
    <>
      <Navbar />
      <Motd />
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
