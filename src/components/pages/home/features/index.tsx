'use client'

import {
  ArrowUpRight,
  ArrowDownLeft,
  Star,
  BadgeCheck,
  Coins,
  Award,
  Sparkles,
} from 'lucide-react'
import Image from 'next/image'
import React, { useState } from 'react'

const Features = () => {
  const [activeFeature, setActiveFeature] = useState(0)

  const features = [
    {
      superHeading: '01',
      heading: 'Best Pricing',
      description:
        'Premium quality meets unbeatable pricing. Experience cost savings without compromising on features or quality. Flexible pricing plans that scale seamlessly with your business needs and requirements.',
      stats: { label: 'Starting from', value: '$0.80/min' },
      detail: 'Save up to 40%',
      icon: Coins,
      color: 'bg-violet-500',
      bgGradient:
        'bg-white bg-gradient-to-br from-violet-500/10 via-purple-500/10 to-violet-500/10',
      lightColor: 'bg-violet-50',
      spacing: 144,
    },
    {
      superHeading: '02',
      heading: 'Human Verified',
      description:
        'Access our network of 50K+ certified transcribers ensuring quality at every step. Every project undergoes rigorous quality checks by professionals, combining human expertise with cutting-edge technology.',
      stats: { label: 'Active experts', value: '50K+' },
      detail: '99.9% client satisfaction rate',
      icon: Award,
      color: 'bg-blue-500',
      bgGradient:
        'bg-white bg-gradient-to-br from-blue-500/10 via-cyan-500/10 to-blue-500/10',
      lightColor: 'bg-blue-50',
      spacing: 96,
    },
    {
      superHeading: '03',
      heading: '99% Accuracy',
      description:
        'Our advanced transcription system captures every word with precision. Multiple professional reviews ensure your audio/video file is transcribed with exceptional accuracy.',
      stats: { label: 'Accuracy rate', value: '99%' },
      detail: '4.9/5 average rating',
      icon: BadgeCheck,
      color: 'bg-emerald-500',
      bgGradient:
        'bg-white bg-gradient-to-br from-emerald-500/5 via-green-500/5 to-emerald-500/5',
      lightColor: 'bg-emerald-50',
      spacing: 48,
    },
  ]

  const avatars = [
    {
      id: 1,
      image: '/assets/images/home/avatars/avatar1.webp',
      alt: 'Katherine Volk',
      fallbackColor: 'bg-violet-500',
      initials: 'KV',
    },
    {
      id: 2,
      image: '/assets/images/home/avatars/avatar2.webp',
      alt: 'John Hampton',
      fallbackColor: 'bg-blue-500',
      initials: 'JH',
    },
    {
      id: 3,
      image: '/assets/images/home/avatars/avatar3.webp',
      alt: 'Elli Wynter',
      fallbackColor: 'bg-emerald-500',
      initials: 'EW',
    },
  ]

  return (
    <section className='relative mt-20 sm:mt-28 md:mt-32 lg:mt-40'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4 lg:pb-10'>
        <div className='grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12'>
          <div className='lg:col-span-5 space-y-8'>
            <div>
              <div className='inline-flex items-center gap-2 px-3 sm:px-4 py-1 rounded-full bg-gradient-to-r from-secondary to-muted border border-secondary'>
                <Sparkles className='w-3 h-3 sm:w-4 sm:h-4 text-primary' />
                <span className='text-xs sm:text-sm font-medium text-primary'>
                  Our Features
                </span>
              </div>

              <h2 className='mt-3 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground max-w-xl sm:max-w-3xl lg:max-w-5xl leading-tight sm:leading-[1.2] md:leading-[1.3] lg:leading-[1.1]'>
                What makes us <span className='text-primary'>different</span>
              </h2>

              <p className='lg:hidden mt-4 sm:mt-6 lg:mt-8 text-muted-foreground lg:max-w-2xl text-base sm:text-lg'>
                Experience the perfect blend of technology and human expertise,
                delivering unmatched quality and efficiency. We combine
                cutting-edge innovation with expert knowledge to provide you
                with the best possible service.
              </p>
            </div>

            <div className='bg-secondary border border-customBorder rounded-2xl p-4 sm:p-6 shadow-sm'>
              <div className='flex flex-col gap-4 sm:gap-6'>
                <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
                  <div className='flex items-center gap-3'>
                    <div className='flex -space-x-3'>
                      {avatars.map((user) => (
                        <div
                          key={user.id}
                          className='w-8 h-8 sm:w-10 sm:h-10 rounded-full ring-2 ring-primary/50 overflow-hidden flex items-center justify-center text-xs font-semibold text-primary-foreground'
                        >
                          <div
                            className={`relative w-full h-full ${user.fallbackColor} flex items-center justify-center`}
                          >
                            <Image
                              src={user.image}
                              alt={user.alt}
                              width={40}
                              height={40}
                              className='object-cover w-full h-full'
                              sizes='(max-width: 768px) 32px, 40px'
                              quality={80}
                              loading='lazy'
                              placeholder='blur'
                              blurDataURL='data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDABQODxIPDRQSEBIXFRQdHx0fHRsdHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR3/2wBDAR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR3/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k='
                              onError={(e) => {
                                const parent = (e.target as HTMLElement)
                                  .parentElement
                                if (parent) {
                                  parent.innerHTML = user.initials
                                }
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className='text-xs sm:text-sm text-muted-foreground'>
                      Trusted by{' '}
                      <span className='font-semibold text-foreground'>94K+</span>{' '}
                      users
                    </p>
                  </div>
                </div>

                <div className='flex items-center justify-between border-t border-customBorder pt-4'>
                  <div className='flex items-center gap-2'>
                    <div className='relative flex h-2 w-2 sm:h-3 sm:w-3'>
                      <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75' />
                      <span className='relative inline-flex rounded-full h-2 w-2 sm:h-3 sm:w-3 bg-green-500' />
                    </div>
                    <span className='text-xs sm:text-sm text-muted-foreground'>
                      <span className='font-semibold text-foreground'>24/7</span>{' '}
                      live support available
                    </span>
                  </div>

                  <div className='flex items-center gap-1'>
                    <div className='flex'>
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className='w-3 h-3 sm:w-4 sm:h-4 text-yellow-400 fill-current'
                        />
                      ))}
                    </div>
                    <span className='text-xs sm:text-sm font-medium text-foreground'>
                      4.9/5
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className='relative pr-4 mt-8 sm:mt-12'>
              <div className='absolute left-6 top-8 bottom-8 w-px bg-gradient-to-b from-gray-100 via-gray-200 to-gray-100' />

              <div className='space-y-4'>
                {features.map((feature, index) => (
                  <button
                    key={index}
                    className={`group relative w-full text-left p-4 rounded-2xl transition-all duration-300 ${
                      activeFeature === index
                        ? feature.lightColor + ' shadow-sm'
                        : 'hover:bg-secondary'
                    }`}
                    onClick={() => setActiveFeature(index)}
                  >
                    <div className='flex items-center gap-4'>
                      <div
                        className={`relative z-10 w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center transform transition-transform duration-300 group-hover:scale-105 ${
                          activeFeature === index
                            ? feature.color +
                              ' text-primary-foreground shadow-lg'
                            : 'bg-primary-foreground border border-customBorder text-muted-foreground'
                        }`}
                      >
                        <span className='text-sm sm:text-base font-semibold'>
                          {feature.superHeading}
                        </span>
                      </div>

                      <div className='flex-grow'>
                        <h3
                          className={`text-lg sm:text-xl font-semibold transition-colors duration-300 ${
                            activeFeature === index
                              ? 'text-gray-900'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {feature.heading}
                        </h3>
                      </div>

                      <div className='hidden lg:block'>
                        <ArrowUpRight
                          className={`w-4 h-4 sm:w-5 sm:h-5 transform transition-all duration-300 text-muted-foreground ${
                            activeFeature === index
                              ? 'translate-x-0 opacity-100'
                              : '-translate-x-4 opacity-0'
                          }`}
                        />
                      </div>
                      <div className='block lg:hidden'>
                        <ArrowDownLeft
                          className={`w-4 h-4 sm:w-5 sm:h-5 transform transition-all duration-300 ${
                            activeFeature === index
                              ? 'translate-x-0 opacity-100'
                              : '-translate-x-4 opacity-0'
                          }`}
                        />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className='lg:col-span-7'>
            <div className='hidden lg:block mt-8 lg:mt-12 mb-12 lg:mb-16'>
              <p className='text-muted-foreground text-sm sm:text-base lg:text-lg max-w-none sm:max-w-xl lg:max-w-2xl mx-auto'>
                Experience the perfect blend of technology and human expertise,
                delivering unmatched quality and efficiency. We combine
                cutting-edge innovation with expert knowledge to provide you
                with the best possible service.
              </p>
            </div>

            <div className='relative h-[400px] sm:h-[500px]'>
              {features.map((feature, index) => {
                const isActive = activeFeature === index
                const position = index - activeFeature

                return (
                  <div
                    key={index}
                    className='absolute w-full transition-all duration-500 ease-out'
                    style={{
                      top: isActive ? '0' : `${position * 30}px`,
                      opacity: isActive ? 1 : 0.6 - Math.abs(position) * 0.15,
                      transform: `scale(${1 - Math.abs(position) * 0.05})`,
                      zIndex: features.length - Math.abs(position),
                      visibility: Math.abs(position) > 2 ? 'hidden' : 'visible',
                    }}
                  >
                    <div
                      className={`${feature.bgGradient} rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 shadow-xl`}
                    >
                      <div className='space-y-6 sm:space-y-8'>
                        <div
                          className={`w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-xl sm:rounded-2xl ${feature.color} flex items-center justify-center`}
                        >
                          <feature.icon className='w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-primary-foreground' />
                        </div>

                        <div className=''>
                          <p className='text-gray-600 text-sm sm:text-base lg:text-lg leading-relaxed'>
                            {feature.description}
                          </p>
                        </div>

                        <div className='grid grid-cols-3 gap-1 sm:gap-6 pt-4'>
                          <div className='col-span-1 space-y-1 sm:space-y-2'>
                            <p className='text-xs sm:text-sm text-gray-700 font-semibold'>
                              {feature.stats.label}
                            </p>
                            <p className='text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900'>
                              {feature.stats.value}
                            </p>
                          </div>
                          <div className='col-span-2 flex items-end'>
                            <span
                              className={`text-xs sm:text-sm text-primary-foreground font-semibold ${feature.color} px-2 sm:px-3 py-1 rounded-full border border-gray-100`}
                            >
                              {feature.detail}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Features
