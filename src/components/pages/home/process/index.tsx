'use client'

import { FileAudio, Upload, CreditCard, Download, Sparkles } from 'lucide-react'
import Link from 'next/link'
import React from 'react'

const Process = () => {
  const steps = [
    {
      icon: <Upload className='w-6 h-6' />,
      title: 'Upload Your Content',
      description:
        'Upload or import your audio/video files. We support all major formats.',
      accent: 'bg-primary',
      gradient: 'from-primary/20 to-transparent',
      number: '01',
    },
    {
      icon: <CreditCard className='w-6 h-6' />,
      title: 'Secure Payment',
      description:
        'Choose your preferred payment method. SSL-encrypted and totally secure.',
      accent: 'bg-blue-500',
      gradient: 'from-blue-500/20 to-transparent',
      number: '02',
    },
    {
      icon: <Download className='w-6 h-6' />,
      title: 'Get Your Transcript',
      description:
        'Download perfectly formatted transcripts or edit them in our online editor.',
      accent: 'bg-emerald-500',
      gradient: 'from-emerald-500/20 to-transparent',
      number: '03',
    },
  ]

  return (
    <section className='mt-20 sm:mt-28 md:mt-32 lg:mt-40'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='text-center mb-8 sm:mb-12 lg:mb-16'>
          <div className='inline-flex items-center gap-2 px-3 sm:px-4 py-1 rounded-full bg-gradient-to-r from-secondary to-muted border border-secondary'>
            <Sparkles className='w-3 h-3 sm:w-4 sm:h-4 text-primary' />
            <span className='text-xs sm:text-sm font-medium text-primary'>
              Simple Process
            </span>
          </div>

          <h2 className='mt-3 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground max-w-xl sm:max-w-3xl lg:max-w-5xl mx-auto leading-tight sm:leading-[1.2] md:leading-[1.3] lg:leading-[1.1]'>
            Three steps to{' '}
            <span className='text-primary'>perfect transcription</span>
          </h2>

          <p className='mt-4 sm:mt-6 lg:mt-8 text-gray-700 max-w-sm sm:max-w-xl lg:max-w-2xl mx-auto text-base sm:text-lg'>
            Get started in minutes with our streamlined process. No technical
            expertise required
          </p>
        </div>

        <div className='relative'>
          <div className='grid lg:grid-cols-3 gap-8 mb-8 sm:mb-16'>
            {steps.map((step) => (
              <div
                key={step.title}
                className='group relative bg-background rounded-2xl p-8 hover:shadow-xl transition-all duration-500 border border-border overflow-hidden'
              >
                <div className='absolute top-4 right-5 text-[60px] sm:text-[80px] md:text-[95px] lg:text-[110px] font-bold text-muted select-none z-0 leading-none'>
                  {step.number}
                </div>

                <div
                  className={`absolute inset-0 bg-gradient-to-br ${step.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
                />

                <div className='relative z-10'>
                  <div
                    className={`w-12 h-12 ${step.accent} rounded-xl flex items-center justify-center text-primary-foreground mb-6 transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-500`}
                  >
                    {step.icon}
                  </div>

                  <h3 className='text-xl font-semibold text-foreground mb-4 group-hover:text-foreground'>
                    {step.title}
                  </h3>

                  <p className='text-gray-700 leading-relaxed group-hover:text-gray-800'>
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className='text-center'>
            <Link
              href='/signin'
              className='group relative inline-flex items-center px-8 py-4 text-lg font-semibold text-primary-foreground bg-primary rounded-full hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-300 overflow-hidden'
            >
              <span className='absolute inset-0 bg-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300' />
              <FileAudio className='w-5 h-5 mr-3 relative' />
              <span className='relative'>Start Transcribing Now</span>
            </Link>

            <p className='mt-4 text-sm text-gray-700'>
              Pay with Card or PayPal • One time payment
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Process
