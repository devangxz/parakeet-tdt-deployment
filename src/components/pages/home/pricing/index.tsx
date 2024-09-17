'use client'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { BASE_FARE } from '@/constants'

const featuresBasic = [
  'Audio time coding',
  'Speaker tracking',
  'SRT/VTT subtitle file',
  'Word document',
]
const featuresAdvanced = [
  { name: 'Strict verbatim', code: 'atc', price: 0.5 },
  { name: 'Rush hour', code: 'rh', price: 1.25 },
  { name: 'Noisy/accented audio', code: 'naa', price: 0.5 },
]
export default function Pricing() {
  const router = useRouter()
  const [time, setTime] = useState<{ hr: number; min: number }>({
    hr: 1,
    min: 0,
  })
  const [totalMinutes, setTotalMinutes] = useState(60)
  const [netPrice, setNetPrice] = useState<number>(BASE_FARE * 60)
  const [advancedOptions, setAdvancedOptions] = useState({
    atc: { state: false, price: 0.5 },
    rh: { state: false, price: 1.25 },
    srt: { state: false, price: 1.5 },
    naa: { state: false, price: 0.5 },
  })
  const handleTime = (cTime: number, type: string) => {
    const newTime = { ...time }
    let totalMinutes = time.hr * 60 + time.min

    if (type === 'hrs') {
      newTime.hr = Math.max(1, cTime)
    } else {
      newTime.min = Math.max(0, Math.min(59, cTime))
      if (cTime > 59) {
        newTime.hr += 1
        newTime.min = 0
      }
    }

    totalMinutes = newTime.hr * 60 + newTime.min
    setTime(newTime)
    setTotalMinutes(totalMinutes)

    const totalPrice = Object.values(advancedOptions).reduce(
      (acc, { state, price }) => acc + (state ? price * totalMinutes : 0),
      0
    )
    const baseFare = parseFloat((BASE_FARE * totalMinutes).toFixed(2))
    setNetPrice(totalPrice + baseFare)
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
    <div
      className='sm:bg-transparent bg-indigo-900 px-7 lg:px-[10%] py-[3rem] mt-[3rem] sm:mt-[5rem]'
      id='pricing'
    >
      <div className='w-fit text-[1.125rem] font-semibold leading-6 text-white sm:text-indigo-600 mx-auto'>
        Our Pricing
      </div>
      <div className='mt-[1rem] mb-[3rem] w-full text-[2rem] sm:text-[2.75rem] font-semibold text-center text-white sm:text-black text-opacity-90'>
        High standards, honest & transparent prices
      </div>
      {/* Banner */}
      <div className='flex flex-col sm:py-16 sm:px-10 justify-center bg-indigo-900 border-indigo-900 border-2 rounded-[32px_32px_0_0]'>
        <div className='flex gap-5'>
          <div className='flex flex-col w-[100%]'>
            <div className='flex flex-col justify-center grow text-white'>
              <div className='hidden sm:block text-base max-md:max-w-full'>
                Price calculator
              </div>
              <div className='text-2xl flex flex-col xl:flex-row gap-y-5 justify-around mt-4 md:text-5xl font-semibold'>
                <span className='w-full xl:w-[65%] text-base sm:text-3xl md:text-5xl font-normal sm:font-semibold text-amber-300 sm:text-white'>
                  Transcribe a file size of
                </span>
                <div className='w-full xl:w-[35%] space-y-2 justify-start items-center sm:justify-end grow gap-2.5 font-semibold'>
                  <div className='text-base leading-9 text-white'>
                    <span className='font-semibold'>
                      For bulk files / Enterprise,{' '}
                      <a href='/contact' className='underline'>
                        contact us
                      </a>
                      .
                    </span>
                  </div>
                  <div className='flex gap-6'>
                    <div className='flex gap-2.5 justify-center md:justify-around items-center bg-white rounded-lg pr-2'>
                      <Input
                        type='number'
                        className=' text-black '
                        placeholder='hrs'
                        value={time.hr}
                        onChange={(e) =>
                          handleTime(Number(e.target.value), 'hrs')
                        }
                      />
                      <div className='text-sm leading-5 text-indigo-600'>
                        HRS
                      </div>
                    </div>
                    <div className='flex gap-2.5 justify-center md:justify-around items-center bg-white rounded-lg pr-2'>
                      <Input
                        type='number'
                        className=' text-black'
                        placeholder='hrs'
                        value={time.min}
                        onChange={(e) =>
                          handleTime(Number(e.target.value), 'min')
                        }
                      />
                      <div className='text-sm leading-5 text-indigo-600'>
                        MIN
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className='w-full pt-14 flex flex-col lg:flex-row gap-x-5 gap-y-14 justify-between'>
          <div className='flex flex-col w-full lg:w-[50%]'>
            <div className='text-md md:text-base md:font-semibold leading-6 text-amber-300'>
              Basic (Free)
            </div>
            <div className='mt-8 grid grid-cols-1 gap-8'>
              {featuresBasic.map((feature, index) => (
                <div
                  key={index}
                  className='flex items-center justify-between md:justify-start gap-2'
                >
                  <div className='flex gap-2 items-center md:justify-start md:gap-4 md:items-center w-[80%]'>
                    <Switch id='price' />
                    <span className='text-[12px] sm:text-base text-white flex gap-1'>
                      {feature}
                      <Image
                        alt={feature}
                        src='/assets/images/home/info.svg'
                        width={18}
                        height={18}
                      />
                    </span>
                  </div>
                  <span className='text-sm sm:text-base text-white'>$0</span>
                </div>
              ))}
            </div>
          </div>
          <div className='flex flex-col w-full lg:w-[50%]'>
            <div className='text-md md:text-base md:font-semibold leading-6 text-amber-300'>
              Advanced (Paid)
            </div>
            <div className='mt-8 grid grid-cols-1 gap-8'>
              {featuresAdvanced.map((feature, index) => (
                <div
                  key={index}
                  className='flex items-center justify-between md:justify-start gap-2'
                >
                  <div className='flex gap-2 items-center md:justify-start md:gap-4 md:items-center w-[80%]'>
                    <Switch
                      id='price'
                      name={feature.code}
                      value={feature.price}
                      onCheckedChange={(isChecked) =>
                        handlePrice({
                          name: feature.code,
                          checked: isChecked,
                          code: feature.code,
                        })
                      }
                    />
                    <span className='text-[12px] sm:text-base text-white flex gap-1'>
                      {feature.name}
                      <Image
                        alt={feature.name}
                        src='/assets/images/home/info.svg'
                        width={18}
                        height={18}
                      />
                    </span>
                  </div>
                  <span className='text-sm sm:text-base text-white'>
                    {`+$${feature.price}/min`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {/* Princing */}
      <div className='flex flex-col mt-[4rem] sm:mt-0 sm:py-7 sm:px-10 justify-center bg-transparent border-indigo-900 border-2 rounded-[0_0_32px_32px] overflow-hidden'>
        <div className='flex p-7 sm:p-0 bg-white rounded-[16px] bg-transparent flex-col gap-5 lg:flex-row lg:items-center w-full'>
          <div className='flex flex-col justify-between w-[100%] lg:w-[50%]'>
            <div className='font-bold text-2xl'>You will pay</div>
            <p className='text-lg text-left my-2'>
              For files with clear audio & above services
            </p>
          </div>
          <div className='w-[100%] justify-between flex flex-col lg:flex-row items-start md:justify-end lg:w-[50%] gap-8 lg:items-center'>
            <div className='text-md lg:text-lg text-left'>
              <span className='flex items-center'>
                <span className='text-xl md:text-2xl font-semibold text-indigo-600'>
                  ${netPrice}
                </span>
                {/* <span className='text-xl md:text-xl ml-2 font-semibold line-through text-black'>
                  $134.43
                </span> */}
              </span>
              <p>@ $0.80 per audio min</p>
            </div>
            <button
              onClick={() => router.push('/files/upload')}
              className='px-1 py-3 w-[100%] text-sm font-semibold lg:w-[25%] text-white bg-[#6442ED] rounded-[32px]'
            >
              Get Started
            </button>
          </div>
        </div>
      </div>
      {/* Bulk FIles  */}
      {/* <div className='flex pb-10 flex-col justify-center m-auto md:my-5 md:px-0 md:w-[80%]'>
        <div className='flex flex-col justify-center p-8 w-full bg-white rounded-3xl border-2 border-violet-100 max-w-[1124px] md:px-14 md:mt-10 md:max-w-full'>
          <div className='flex flex-col md:flex-row gap-5 justify-between md:items md:flex-wrap'>
            <div className='text-base leading-9 text-black'>
              <span className='font-semibold'>
                For bulk files / Enterprise orders
              </span>
              , contact us for best & custom pricing
            </div>
            <button className='px-16 py-3 text-lg font-semibold leading-5 text-indigo-600 bg-violet-100 rounded-[32px] md:px-10'>
              Contact Us
            </button>
          </div>
        </div>
      </div> */}
    </div>
  )
}
