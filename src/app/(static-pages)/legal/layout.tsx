import { Metadata } from 'next'

import Footer from '@/components/footer'
import Navbar from '@/components/navbar'

export const metadata: Metadata = {
  title:
    'Scribie Legal Transcription Services | $.80/min. | 99.9% Accuracy | 24-HR Turnaround | Scribie | USA | Canada<meta name="keywords" content="legal transcription, deposition transcription, court transcriptionist, courtroom transcriptionist, scribie transcription, transcription services, law transcription, audio transcription, legal transcription services, human-verified transcription.',
  description:
    'Legal transcription services that are 99%+ accurate, secure, and custom formatted to court requirements are available from Scribie. Hire court transcriptionists at industry-leading prices starting from $0.8/min and with 24-hour delivery. You can learn more about the specialist deposition transcription services that Scribie offers to court reporting firms.',
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
