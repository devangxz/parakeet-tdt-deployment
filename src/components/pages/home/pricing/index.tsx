'use client'

import {
  Clock,
  Wand2,
  Volume2,
  Timer,
  FileText,
  Sparkles,
  Files,
  Zap,
  Gauge,
  Waves,
  Wallet,
  Check,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { useState } from 'react'

import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'

const BASE_FARE = 0.8

const featuresBasic = [
  {
    name: 'Audio Time Coding',
    icon: Timer,
    description: 'Automated timestamp syncing',
  },
  {
    name: 'Speaker Tracking',
    icon: Volume2,
    description: 'Advanced voice recognition',
  },
  {
    name: 'Dual Format Export',
    icon: Files,
    description: 'SRT/VTT subtitle file',
  },
  {
    name: 'Word Document',
    icon: FileText,
    description: 'AI-enhanced formatting',
  },
]

const featuresAdvanced = [
  {
    name: 'Precision Verbatim',
    code: 'atc',
    price: 0.5,
    icon: Wand2,
    description: '99.9% accuracy guaranteed',
  },
  {
    name: 'Priority Processing',
    code: 'rh',
    price: 1.25,
    icon: Gauge,
    description: '2x faster delivery',
  },
  {
    name: 'Noisy & Accented Audio',
    code: 'naa',
    price: 0.5,
    icon: Waves,
    description: 'Handle noisy audio & accents',
  },
]

const Pricing = () => {
  const router = useRouter()
  const [time, setTime] = useState({ hr: 1, min: 0 })
  const [totalMinutes, setTotalMinutes] = useState(60)
  const [netPrice, setNetPrice] = useState(BASE_FARE * 60)
  const [advancedOptions, setAdvancedOptions] = useState({
    atc: { state: false, price: 0.5 },
    rh: { state: false, price: 1.25 },
    naa: { state: false, price: 0.5 },
  })

  const updatePricing = (totalMins: number) => {
    setTotalMinutes(totalMins)
    const totalPrice = Object.values(advancedOptions).reduce(
      (acc, { state, price }) => acc + (state ? price * totalMins : 0),
      0
    )
    const baseFare = parseFloat((BASE_FARE * totalMins).toFixed(2))
    setNetPrice(totalPrice + baseFare)
  }

  const handleTime = (value: string, type: string) => {
    const numValue = value === '' ? 0 : parseInt(value)
    if (isNaN(numValue)) return

    const newTime = { ...time }

    if (type === 'hrs') {
      if (numValue === 24) {
        newTime.hr = 24
        newTime.min = 0
      } else if (numValue >= 0 && numValue < 24) {
        newTime.hr = numValue
        if (numValue === 0 && newTime.min === 0) {
          newTime.min = 1
        }
      } else {
        return
      }
    } else {
      if (newTime.hr === 24) {
        newTime.min = 0
      } else if (numValue >= 0 && numValue < 60) {
        if (newTime.hr === 0 && numValue === 0) {
          newTime.min = 1
        } else {
          newTime.min = numValue
        }
      } else {
        return
      }
    }

    setTime(newTime)
    updatePricing(newTime.hr * 60 + newTime.min)
  }

  const handleIncrement = (type: string) => {
    const newTime = { ...time }

    if (type === 'hrs') {
      if (time.hr < 24) {
        newTime.hr = time.hr + 1
        if (newTime.hr === 24) newTime.min = 0
      }
    } else {
      if (time.hr < 24) {
        if (time.min === 59) {
          newTime.min = 0
          newTime.hr = Math.min(24, time.hr + 1)
          if (newTime.hr === 24) newTime.min = 0
        } else {
          newTime.min = time.min + 1
        }
      }
    }

    setTime(newTime)
    updatePricing(newTime.hr * 60 + newTime.min)
  }

  const handleDecrement = (type: string) => {
    const newTime = { ...time }

    if (type === 'hrs') {
      if (time.hr > 0) {
        newTime.hr = time.hr - 1
        if (newTime.hr === 0 && newTime.min === 0) {
          newTime.min = 1
        }
      }
    } else {
      if (time.min === 0) {
        if (time.hr > 0) {
          newTime.hr = time.hr - 1
          newTime.min = 59
        }
      } else if (time.hr === 0 && time.min === 1) {
        return
      } else {
        newTime.min = time.min - 1
      }
    }

    setTime(newTime)
    updatePricing(newTime.hr * 60 + newTime.min)
  }

  const handlePrice = ({
    name,
    checked,
    code,
  }: {
    name: string
    checked: boolean
    code: string
  }) => {
    const optionPrice =
      advancedOptions[name as keyof typeof advancedOptions].price
    const price = optionPrice * totalMinutes

    checked
      ? setNetPrice((prevPrice) => prevPrice + price)
      : setNetPrice((prevPrice) => prevPrice - price)

    setAdvancedOptions({
      ...advancedOptions,
      [code]: {
        ...advancedOptions[code as keyof typeof advancedOptions],
        state: checked,
      },
    })
  }

  return (
    <section
      className='relative mt-20 sm:mt-28 md:mt-32 lg:mt-40'
      id='pricing'
    >
      <div className='relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='text-center mb-8 sm:mb-12 lg:mb-16'>
          <div className='inline-flex items-center gap-2 px-3 sm:px-4 py-1 rounded-full bg-gradient-to-r from-secondary to-muted border border-secondary'>
            <Sparkles className='w-3 h-3 sm:w-4 sm:h-4 text-primary' />
            <span className='text-xs sm:text-sm font-medium text-primary'>
              Our Simple Pricing
            </span>
          </div>

          <h2 className='mt-3 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground max-w-xl sm:max-w-3xl lg:max-w-5xl mx-auto leading-tight sm:leading-[1.2] md:leading-[1.3] lg:leading-[1.1]'>
            High standards,{' '}
            <span className='text-primary'>honest & transparent</span> prices
          </h2>

          <p className='mt-4 sm:mt-6 lg:mt-8 text-muted-foreground max-w-sm sm:max-w-xl lg:max-w-2xl mx-auto text-base sm:text-lg'>
            Calculate transcription costs instantly by entering your media
            duration and selecting premium features
          </p>
        </div>

        <Card className='backdrop-blur-xl bg-gradient-to-r from-primary/90 to-primary/80 border-0 shadow-xl'>
          <CardContent className='p-3 sm:p-6 lg:p-8'>
            <div className='grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8'>
              <div>
                <div className='mb-4'>
                  <h3 className='text-base sm:text-lg font-medium text-primary-foreground flex items-center gap-2'>
                    <Clock className='w-4 h-4' />
                    Media Duration
                  </h3>
                  <p className='text-sm text-primary-foreground/80 mt-1'>
                    Enter the length of your file to be transcribed
                  </p>
                </div>
                <div className='flex flex-col sm:flex-row gap-4'>
                  <div className='relative w-full sm:w-44'>
                    <div className='absolute right-12 inset-y-0 flex flex-col justify-center gap-0.5 pr-2 border-r border-customBorder'>
                      <button
                        onClick={() => handleIncrement('hrs')}
                        className='text-primary hover:text-primary/80 focus:outline-none p-0.5 disabled:opacity-50'
                        disabled={time.hr === 24}
                      >
                        <svg
                          className='w-4 h-4'
                          fill='currentColor'
                          viewBox='0 0 16 16'
                        >
                          <path d='M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z' />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDecrement('hrs')}
                        className='text-primary hover:text-primary/80 focus:outline-none p-0.5'
                      >
                        <svg
                          className='w-4 h-4'
                          fill='currentColor'
                          viewBox='0 0 16 16'
                        >
                          <path d='M4 8a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7A.5.5 0 0 1 4 8z' />
                        </svg>
                      </button>
                    </div>
                    <Input
                      type='number'
                      min='0'
                      max='24'
                      className='w-full h-12 text-base sm:text-lg bg-secondary border-0 focus:border-background rounded-lg pr-20 pl-4 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
                      value={time.hr}
                      onChange={(e) => handleTime(e.target.value, 'hrs')}
                    />
                    <span className='absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-primary'>
                      HRS
                    </span>
                  </div>
                  <div className='relative w-full sm:w-44'>
                    <div className='absolute right-12 inset-y-0 flex flex-col justify-center gap-0.5 pr-2 border-r border-customBorder'>
                      <button
                        onClick={() => handleIncrement('min')}
                        className='text-primary hover:text-primary/80 focus:outline-none p-0.5 disabled:opacity-50'
                        disabled={time.hr === 24}
                      >
                        <svg
                          className='w-4 h-4'
                          fill='currentColor'
                          viewBox='0 0 16 16'
                        >
                          <path d='M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z' />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDecrement('min')}
                        className='text-primary hover:text-primary/80 focus:outline-none p-0.5 disabled:opacity-50'
                        disabled={time.hr === 24}
                      >
                        <svg
                          className='w-4 h-4'
                          fill='currentColor'
                          viewBox='0 0 16 16'
                        >
                          <path d='M4 8a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7A.5.5 0 0 1 4 8z' />
                        </svg>
                      </button>
                    </div>
                    <Input
                      type='number'
                      min='0'
                      max='59'
                      className='w-full h-12 text-base sm:text-lg bg-secondary border-0 focus:border-background rounded-lg pr-20 pl-4 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:opacity-100 disabled:disabled:bg-background/90'
                      value={time.min}
                      onChange={(e) => handleTime(e.target.value, 'min')}
                      disabled={time.hr === 24}
                    />
                    <span className='absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-primary'>
                      MIN
                    </span>
                  </div>
                </div>
              </div>

              <div className='relative mt-6 pt-6 border-t lg:border-t-0 lg:mt-0 lg:pt-0'>
                <div className='hidden lg:block absolute -left-4 top-0 bottom-0 w-px bg-primary-foreground/20'></div>
                <div>
                  <div className='mb-4'>
                    <h3 className='text-base sm:text-lg font-medium text-primary-foreground flex items-center gap-2'>
                      <Wallet className='w-4 h-4' />
                      You will pay
                    </h3>
                    <p className='text-sm text-primary-foreground/80 mt-1'>
                      For bulk files / Enterprise,{' '}
                      <Link
                        href='/contact'
                        className='text-primary-foreground underline-offset-2 hover:underline'
                      >
                        contact us
                      </Link>
                      .
                    </p>
                  </div>

                  <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0'>
                    <div className='flex flex-col gap-1'>
                      <div className='flex items-baseline gap-2'>
                        <span className='text-3xl sm:text-4xl font-bold text-primary-foreground'>
                          ${netPrice.toFixed(2)}
                        </span>
                        <span className='text-sm text-primary-foreground/80'>
                          @ ${BASE_FARE}/min
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => router.push('/upload')}
                      className='w-full sm:w-auto px-6 py-3 bg-secondary rounded-lg font-medium text-primary shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all flex items-center justify-center sm:justify-start gap-2 whitespace-nowrap'
                    >
                      <Zap className='w-4 h-4' />
                      Start Now
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className='w-full h-px bg-primary-foreground/20 my-6 sm:my-8'></div>

            <div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
              <div className='space-y-4 sm:space-y-6'>
                <div className='flex items-center gap-3'>
                  <h3 className='text-lg sm:text-xl font-semibold text-primary-foreground'>
                    Standard Features
                  </h3>
                  <span className='px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium text-emerald-700 bg-emerald-50/90 rounded-full'>
                    Included
                  </span>
                </div>

                <div className='grid gap-3 sm:gap-4'>
                  {featuresBasic.map((feature, index) => (
                    <Card key={index} className='bg-secondary border-0'>
                      <CardContent className='py-3 px-2 sm:p-4'>
                        <div className='flex items-center justify-between'>
                          <div className='flex items-center gap-3 sm:gap-4'>
                            <div className='flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600'>
                              <feature.icon className='w-4 h-4 sm:w-5 sm:h-5' />
                            </div>
                            <div>
                              <h4 className='text-sm sm:text-base font-medium text-foreground'>
                                {feature.name}
                              </h4>
                              <p className='mt-0.5 sm:mt-1 text-xs sm:text-sm text-muted-foreground'>
                                {feature.description}
                              </p>
                            </div>
                          </div>
                          <div className='flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-full bg-emerald-200 text-emerald-700 ml-3 sm:ml-4'>
                            <Check className='w-4 h-4' />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <div className='space-y-4 sm:space-y-6'>
                <div className='flex items-center gap-3'>
                  <h3 className='text-lg sm:text-xl font-semibold text-primary-foreground'>
                    Premium Features
                  </h3>
                  <span className='px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium text-primary bg-secondary rounded-full'>
                    Advanced
                  </span>
                </div>

                <div className='grid gap-3 sm:gap-4'>
                  {featuresAdvanced.map((feature, index) => (
                    <Card key={index} className='bg-secondary border-0'>
                      <CardContent className='py-3 px-2 sm:p-4'>
                        <div className='flex items-center justify-between'>
                          <div className='flex items-center gap-3 sm:gap-4'>
                            <div className='flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary'>
                              <feature.icon className='w-4 h-4 sm:w-5 sm:h-5' />
                            </div>
                            <div>
                              <h4 className='text-sm sm:text-base font-medium text-foreground'>
                                {feature.name}
                              </h4>
                              <div className='flex items-center gap-2 mt-0.5 sm:mt-1'>
                                <p className='text-xs sm:text-sm text-muted-foreground'>
                                  {feature.description}
                                </p>
                                <span className='text-sm font-semibold text-primary whitespace-nowrap'>
                                  +${feature.price}/min
                                </span>
                              </div>
                            </div>
                          </div>
                          <Switch
                            className='ml-3 sm:ml-4 data-[state=checked]:bg-primary'
                            onCheckedChange={(isChecked) =>
                              handlePrice({
                                name: feature.code,
                                checked: isChecked,
                                code: feature.code,
                              })
                            }
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}

export default Pricing
