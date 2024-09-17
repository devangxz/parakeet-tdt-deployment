'use client'
import { MessagesSquare, SlidersHorizontal } from 'lucide-react'
import { useRouter } from 'next/navigation'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { StaticContent } from '@/constants'

export default function Page() {
  const router = useRouter()
  return (
    <div>
      {/* First section  */}
      <div className='hidden bg-muted lg:block py-[5rem]'>
        <div className='grid gap-2 text-center'>
          <h1 className='text-4xl font-bold'>FAQ</h1>
          <p className='text-balance text-muted-foreground'>
            Search our FAQ for answers to anything you might ask.
          </p>
        </div>
      </div>
      {/* Second Section  */}
      <div className='w-full lg:grid lg:grid-cols-2 py-[5rem]'>
        {/* I Section  */}
        <div className='flex flex-col items-center space-y-4'>
          <div className='flex w-[510px] h-[496px] rounded-[32px] bg-[#322078] mx-auto'></div>
          <p className=' text-slate-400 text-center mx-auto'>Get started with using our service/product <br /> to transcribe your files</p>
          <Button className='mx-auto' onClick={()=>router.push("/customer-guide")}>Customer Guide</Button>
        </div>
        {/* II Section  */}
        <div className='space-y-4'>
          <div className='text-4xl font-semibold'>Human Transcription</div>
          <div className='space-y-2'>
            {StaticContent.faq.Accordian.map(
              (
                question: { heading: string; content: string },
                index: number
              ) => (
                <Accordion key={index} type='single' collapsible>
                  <AccordionItem value={question.heading}>
                    <AccordionTrigger className='text-lg'>
                      {question.heading}
                    </AccordionTrigger>
                    <AccordionContent className='text-lg'>
                      {question.content}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              )
            )}
          </div>
        </div>
      </div>
      {/* Third Section  */}
      <div className='w-[100%] flex justify-center gap-[10%] py-[5rem]'>
        <HelpCTA
          Icon={MessagesSquare}
          heading="Can't find your answer?"
          description="We want to answer all of your queries. Get in touch and we'll get back to you as soon as we can."
          callback={() => router.push("/contact")}
        />
        <HelpCTA
          Icon={SlidersHorizontal}
          heading='Technical issue'
          description='Have some technical issues? File a bug report or contact our technical team.'
          callback={() => router.push("/contact")}
        />
      </div>
    </div>
  )
}

function HelpCTA({
  Icon,
  heading,
  description,
  callback,
}: {
  Icon: React.ElementType
  heading: string
  description: string
  callback: () => void
}) {
  return (
    <div
      onClick={() => callback()}
      className='flex flex-start gap-2 w-[30%] p-[1.5rem] border-2 rounded-md cursor-pointer hover:shadow-[rgba(0,0,0,0.05)_0px_1px_2px_0px]' // TODO: on hover add border color
    >
      <i>
        <Icon />
      </i>
      <div>
        <p className='text-[1.3rem] font-semibold'>{heading}</p>
        <p>{description}</p>
      </div>
    </div>
  )
}
