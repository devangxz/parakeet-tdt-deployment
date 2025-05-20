'use client'

import Features from '@/components/pages/home/features'
import Pricing from '@/components/pages/home/pricing'
import Process from '@/components/pages/home/process'
import Section from '@/components/pages/legal/section'
import TranscriptionCategories from '@/components/pages/legal/transcription-categories'

export default function Home() {
  return (
    <>
      <TranscriptionCategories />
      <Section />
      <Process />
      <Pricing />
      <Features />
    </>
  )
}
