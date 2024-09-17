'use client'
import {
  BookText,
  Check,
  ChevronRight,
  DollarSign,
  SquareUserRound,
  Wallet,
} from 'lucide-react'
import { useRouter } from 'next/navigation'

import { TabsContent, TabsList, TabsTrigger } from '@/components/editor/Tabs'
import { Button } from '@/components/ui/button'
import { Tabs } from '@/components/ui/tabs'
export default function Page() {
  const router = useRouter()
  return (
    <div>
      {/* First section  */}
      <div className='hidden bg-muted lg:block py-[5rem]'>
        <div className='grid gap-2 text-center'>
          <h1 className='text-4xl font-bold'>Freelance Transcription</h1>
          <p className='text-balance text-muted-foreground text-center'>
            Work at your convenience and earn $5 to $20 per audio hour. We
            provide automated transcripts to save you around 60% of the typing
            effort.
          </p>
        </div>
      </div>
      {/* Second Section  */}
      <div className='w-full lg:grid lg:grid-cols-2 py-[5rem]'>
        {/* I Section  */}
        <div className='flex flex-col items-center space-y-4'>
          <div className='flex w-[510px] h-[496px] rounded-[32px] bg-[#322078] mx-auto'></div>
          <p className=' text-slate-400 text-center mx-auto'>
            Get started with using our service/product <br /> to transcribe your
            files
          </p>
          <Button
            className='mx-auto'
            onClick={() => router.push('/customer-guide')}
          >
            Customer Guide
          </Button>
        </div>
        {/* II Section  */}
        <div className='space-y-8'>
          <div className='text-4xl font-semibold'>What is Transcription?</div>
          <div className='space-y-6'>
            <div className='space-y-2'>
              <p className='text-xl font-semibold'>1. Listen</p>
              <p>
                Required skills are listening ability and good comprehension of
                English
              </p>
            </div>
            <div className='space-y-2'>
              <p className='text-xl font-semibold'>2. Correct</p>
              <p>
                Apply context, identify mistakes and correct the automated
                transcript
              </p>
            </div>
            <div className='space-y-2'>
              <p className='text-xl font-semibold'>3. Get Paid</p>
              <p>
                Earn $5 to $20 per audio hour, paid into your verified PayPal
                account
              </p>
            </div>
          </div>
        </div>
      </div>
      {/* Third Section  */}
      <div className='w-[100%] px-[10%] flex flex-col gap-[10%] py-[5rem] space-y-6 bg-primary/10'>
        <p className='text-center'>Earnings</p>
        <div className='text-4xl font-semibold text-center'>
          How much can you earn in a month?
        </div>
        <div className='flex w-[100%] justify-center items-center'>
          <div className='bg-white rounded-lg p-[2rem]'>
            <div>
              <Tabs defaultValue='beginner' className='mt-4'>
                <div className='flex items-center justify-between mb-4'>
                  <TabsList className='bg-[#EEE9FF]'>
                    <TabsTrigger value='beginner' className='h-8'>
                      Beginner
                    </TabsTrigger>
                    <TabsTrigger value='intermediate' className='h-8'>
                      Intermediate
                    </TabsTrigger>
                    <TabsTrigger value='advanced' className='h-8'>
                      Advanced
                    </TabsTrigger>
                  </TabsList>
                </div>
                <TabsContent
                  value='beginner'
                  className='p-[12px] rounded-[12px]'
                >
                  <p className='text-2xl font-semibold'>$400/month</p>
                </TabsContent>
                <TabsContent
                  value='intermediate'
                  className='p-[12px] rounded-[12px]'
                >
                  <p className='text-2xl font-semibold'>$800/month</p>
                </TabsContent>
                <TabsContent
                  value='advanced'
                  className='p-[12px] rounded-[12px]'
                >
                  <p className='text-2xl font-semibold'>$1600/month</p>
                </TabsContent>
                <div className='w-[100%]  gap-4 items-center rounded-[8px]'>
                  <p className='flex gap-2 m-0'>
                    <Check size={20} /> Good English Comprehension
                  </p>
                  <p className='flex items-start gap-2'>
                    <Check size={20} /> A Verified PayPal account
                  </p>
                  <p className='flex items-start gap-2'>
                    <Check size={20} />
                    Ability to interpret conversations
                  </p>
                  <p className='flex items-start gap-2'>
                    <Check size={20} /> Laptop/desktop computer and internet
                    connection
                  </p>
                  <p className='flex items-start gap-2'>
                    <Check size={20} /> Ability to apply context and identify
                    mistakes
                  </p>
                  <p className='flex items-start gap-2'>
                    <Check size={20} /> Headphone/headset
                  </p>
                </div>
                <br />
                <div className='bg-primary/10 w-fit p-[.5rem] rounded-lg cursor-pointer'>
                  <p className='flex gap-2'>
                    Signup <ChevronRight />
                  </p>
                </div>
              </Tabs>
            </div>

            <div></div>
          </div>
          <div className='w-[40%] h-fit flex flex-col justify-center space-y-4 bg-primary text-white rounded-r-lg p-[1rem]'>
            <Wallet className='mx-auto text-2xl' size={40} />
            <p className='text-center text-2xl font-semibold'>
              Transcriber Guide
            </p>
            <p className='text-center'>
              The guide has all details about this job
            </p>
            <p className='text-center'>
              This job is available to all individuals with a Verified PayPal
              account
            </p>
            <hr />
            <div
              onClick={() => router.push('/transcriber-guide')}
              className='bg-white text-black w-fit p-[.5rem] rounded-lg cursor-pointer mx-auto'
            >
              <p className='flex gap-2'>
                Read More <ChevronRight />
              </p>
            </div>
          </div>
        </div>
      </div>
      {/* fourth section  */}
      <div className='my-[5rem] space-y-[4rem]'>
        <p className='text-center'>STATS</p>
        <div className='text-4xl font-semibold text-center'>
          We&apos;ve been in business since 2008!
        </div>

        <div className='flex justify-center items-center'>
          <div className='w-[20%] flex flex-col items-center justify-center gap-[1rem]'>
            <DollarSign size={40} />
            <p>
              <strong>$4M</strong> in payouts
            </p>
          </div>
          <div className='w-[20%] flex flex-col items-center justify-center gap-[1rem]'>
            <SquareUserRound size={40} />
            <p>
              <strong>50K+</strong> certified transcribers, globally
            </p>
          </div>
          <div className='w-[20%] flex flex-col items-center justify-center gap-[1rem]'>
            <BookText size={40} />
            <p>
              Over <strong>9M</strong> minutes transcribed
            </p>
          </div>
        </div>
      </div>

      {/* fifth section  */}
      {/* <div className='py-[5rem] space-y-6 bg-primary/10'>
        <p className='text-center'>BENEFITS</p>
        <div className='text-4xl font-semibold text-center'>
          Top 5 reasons to sign up!
        </div>

        <div className='space-y-[10%] mt-[5%]'>
          <div className='flex justify-around'>
            <div className='w-[20%] flex flex-col items-center justify-center'>
              <BookText size={40} />
              <p>
                Over <strong>9M</strong> minutes transcribed
              </p>
            </div>
            <div className='w-[20%] flex flex-col items-center justify-center'>
              <BookText size={40} />
              <p>
                Over <strong>9M</strong> minutes transcribed
              </p>
            </div>
          </div>
          <div className='flex justify-around'>
            <div className='w-[20%] flex flex-col items-center justify-center'>
              <BookText size={40} />
              <p>
                Over <strong>9M</strong> minutes transcribed
              </p>
            </div>
          </div>
          <div className='flex justify-around'>
            <div className='w-[20%] flex flex-col items-center justify-center'>
              <BookText size={40} />
              <p>
                Over <strong>9M</strong> minutes transcribed
              </p>
            </div>
            <div className='w-[20%] flex flex-col items-center justify-center'>
              <BookText size={40} />
              <p>
                Over <strong>9M</strong> minutes transcribed
              </p>
            </div>
          </div>
        </div>
      </div> */}
    </div>
  )
}
