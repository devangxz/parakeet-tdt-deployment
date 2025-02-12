'use client'

import { Sparkles } from 'lucide-react'
import React, { useState, useEffect, useRef } from 'react'

interface NumberCounterProps {
  number: string
}

interface StatHighlightProps {
  number: string
  label: string
}

const NumberCounter = ({ number }: NumberCounterProps) => {
  const [count, setCount] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const countRef = useRef<HTMLSpanElement | null>(null)
  const startTimeRef = useRef<number | null>(null)
  const frameRef = useRef<number | null>(null)

  const numericValue = parseInt(number.replace(/[^0-9]/g, ''))
  const suffix = number.replace(/[0-9]/g, '')

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isVisible) {
          setIsVisible(true)
        }
      },
      { threshold: 0.3 }
    )

    if (countRef.current) {
      observer.observe(countRef.current)
    }

    return () => {
      if (countRef.current) {
        observer.unobserve(countRef.current)
      }
    }
  }, [isVisible])

  useEffect(() => {
    if (!isVisible) return

    const easeOutCubic = (x: number): number => 1 - Math.pow(1 - x, 3)

    const animate = (timestamp: number): void => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp
      }

      const progress = timestamp - (startTimeRef.current || 0)
      const duration = 1500
      const percentage = Math.min(progress / duration, 1)
      const easedProgress = easeOutCubic(percentage)
      const currentCount = Math.round(easedProgress * numericValue)

      setCount(currentCount)

      if (percentage < 1) {
        frameRef.current = requestAnimationFrame(animate)
      }
    }

    frameRef.current = requestAnimationFrame(animate)

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current)
      }
    }
  }, [numericValue, isVisible])

  return (
    <span
      ref={countRef}
      className='relative text-3xl sm:text-4xl lg:text-5xl font-bold'
    >
      <span className='absolute inset-0 text-primary'>
        {count}
        {suffix}
      </span>
      <span className='relative bg-gradient-to-r from-primary to-primary/90 bg-clip-text text-transparent mix-blend-overlay'>
        {count}
        {suffix}
      </span>
    </span>
  )
}

const StatHighlight = ({ number, label }: StatHighlightProps) => (
  <div className='relative group cursor-pointer w-full'>
    <div className='absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-2xl sm:rounded-3xl blur-xl transition-all duration-500 group-hover:blur-2xl' />
    <div className='relative bg-background/95 backdrop-blur-sm border border-customBorder rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 transition-all duration-500 group-hover:scale-[1.02] group-hover:shadow-lg'>
      <div className='flex items-baseline gap-1'>
        <NumberCounter number={number} />
      </div>
      <p className='mt-2 text-sm sm:text-base text-muted-foreground'>{label}</p>
    </div>
  </div>
)

const Achievements = () => (
  <section className='relative mt-20 sm:mt-28 md:mt-32 lg:mt-40'>
    <div className='relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
      <div className='text-center mb-8 sm:mb-16'>
        <div className='inline-flex items-center gap-2 px-3 sm:px-4 py-1 rounded-full bg-gradient-to-r from-secondary to-muted border border-secondary'>
          <Sparkles className='w-3 h-3 sm:w-4 sm:h-4 text-primary' />
          <span className='text-xs sm:text-sm font-medium text-primary'>
            Partnering with Industry Leaders
          </span>
        </div>

        <h2 className='mt-3 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground max-w-xl sm:max-w-3xl lg:max-w-5xl mx-auto leading-tight sm:leading-[1.2] md:leading-[1.3] lg:leading-[1.1]'>
          Empowering the{' '}
          <span className='text-primary'>future of transcription</span> prices
        </h2>

        <p className='mt-4 sm:mt-6 lg:mt-8 text-muted-foreground max-w-sm sm:max-w-xl lg:max-w-2xl mx-auto text-base sm:text-lg'>
          Join thousands of companies worldwide who trust our platform for their
          transcription needs
        </p>
      </div>

      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8'>
        <div className='w-full'>
          <StatHighlight
            number='10M+'
            label='Minutes of audio transcribed with industry-leading accuracy'
          />
        </div>
        <div className='w-full'>
          <StatHighlight
            number='68 NPS'
            label='From satisfied customers and business partners worldwide'
          />
        </div>
        <div className='w-full sm:col-span-2 lg:col-span-1 sm:flex sm:justify-center lg:block'>
          <div className='w-full sm:w-[calc(50%-12px)] lg:w-full'>
            <StatHighlight
              number='94K+'
              label='Happy customers ranging from startups to enterprises'
            />
          </div>
        </div>
      </div>
    </div>
  </section>
)

export default Achievements
