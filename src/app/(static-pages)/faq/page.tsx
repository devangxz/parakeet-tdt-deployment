'use client'
import { FileText, MessagesSquare } from 'lucide-react'
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

  const faqCategories = {
    service: StaticContent.faq.Accordian.slice(0, 5),
    pricing: StaticContent.faq.Accordian.slice(5, 9),
    files: StaticContent.faq.Accordian.slice(9, 13),
    process: StaticContent.faq.Accordian.slice(13, 17),
    security: StaticContent.faq.Accordian.slice(17, 19),
    work: StaticContent.faq.Accordian.slice(19),
  }

  return (
    <section>
      <div className='relative mx-auto max-w-7xl mt-16 sm:mt-20 md:mt-24 lg:mt-32 px-4 sm:px-6 lg:px-8 pb-10 lg:pb-20'>
        <header className='text-center mb-8 sm:mb-12 lg:mb-16'>
          <h1 className='text-4xl md:text-5xl lg:text-6xl font-bold text-foreground max-w-3xl lg:max-w-4xl mx-auto leading-tight md:leading-[1.3] lg:leading-[1.1]'>
            Frequently Asked <span className='text-primary'>Questions</span>
          </h1>

          <p className='mt-4 sm:mt-6 lg:mt-8 text-muted-foreground max-w-sm sm:max-w-xl lg:max-w-2xl mx-auto text-base sm:text-lg'>
            Find answers to common questions about our transcription services
          </p>
        </header>

        <main className='mt-16 sm:mt-20 md:mt-24 lg:mt-32'>
          <div className='mb-16'>
            <h2 className='text-3xl sm:text-4xl font-bold mb-8'>Get Started</h2>
            <div className='space-y-4'>
              {faqCategories.service.map((question, index) => (
                <Accordion key={index} type='single' collapsible>
                  <AccordionItem
                    value={question.heading}
                    className='border border-customBorder rounded-xl overflow-hidden bg-card'
                  >
                    <AccordionTrigger className='px-6 py-4 hover:bg-primary/5 text-lg'>
                      {question.heading}
                    </AccordionTrigger>
                    <AccordionContent className='px-6 py-4 text-muted-foreground text-base sm:text-lg'>
                      {question.content}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              ))}
            </div>
          </div>

          <div className='mb-16'>
            <h2 className='text-3xl sm:text-4xl font-bold mb-8'>Pricing</h2>
            <div className='space-y-4'>
              {faqCategories.pricing.map((question, index) => (
                <Accordion key={index} type='single' collapsible>
                  <AccordionItem
                    value={question.heading}
                    className='border border-customBorder rounded-xl overflow-hidden bg-card'
                  >
                    <AccordionTrigger className='px-6 py-4 hover:bg-primary/5 text-lg'>
                      {question.heading}
                    </AccordionTrigger>
                    <AccordionContent className='px-6 py-4 text-muted-foreground text-base sm:text-lg'>
                      {question.content}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              ))}
            </div>
          </div>

          <div className='mb-16'>
            <h2 className='text-3xl sm:text-4xl font-bold mb-8'>
              File Formats
            </h2>
            <div className='space-y-4'>
              {faqCategories.files.map((question, index) => (
                <Accordion key={index} type='single' collapsible>
                  <AccordionItem
                    value={question.heading}
                    className='border border-customBorder rounded-xl overflow-hidden bg-card'
                  >
                    <AccordionTrigger className='px-6 py-4 hover:bg-primary/5 text-lg'>
                      {question.heading}
                    </AccordionTrigger>
                    <AccordionContent className='px-6 py-4 text-muted-foreground text-base sm:text-lg'>
                      {question.content}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              ))}
            </div>
          </div>

          <div className='mb-16'>
            <h2 className='text-3xl sm:text-4xl font-bold mb-8'>Process</h2>
            <div className='space-y-4'>
              {faqCategories.process.map((question, index) => (
                <Accordion key={index} type='single' collapsible>
                  <AccordionItem
                    value={question.heading}
                    className='border border-customBorder rounded-xl overflow-hidden bg-card'
                  >
                    <AccordionTrigger className='px-6 py-4 hover:bg-primary/5 text-lg'>
                      {question.heading}
                    </AccordionTrigger>
                    <AccordionContent className='px-6 py-4 text-muted-foreground text-base sm:text-lg'>
                      {question.content}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              ))}
            </div>
          </div>

          <div className='mb-16'>
            <h2 className='text-3xl sm:text-4xl font-bold mb-8'>Security</h2>
            <div className='space-y-4'>
              {faqCategories.security.map((question, index) => (
                <Accordion key={index} type='single' collapsible>
                  <AccordionItem
                    value={question.heading}
                    className='border border-customBorder rounded-xl overflow-hidden bg-card'
                  >
                    <AccordionTrigger className='px-6 py-4 hover:bg-primary/5 text-lg'>
                      {question.heading}
                    </AccordionTrigger>
                    <AccordionContent className='px-6 py-4 text-muted-foreground text-base sm:text-lg'>
                      {question.content}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              ))}
            </div>
          </div>

          <div className='mb-16'>
            <h2 className='text-3xl sm:text-4xl font-bold mb-8'>Join Us</h2>
            <div className='space-y-4'>
              {faqCategories.work.map((question, index) => (
                <Accordion key={index} type='single' collapsible>
                  <AccordionItem
                    value={question.heading}
                    className='border border-customBorder rounded-xl overflow-hidden bg-card'
                  >
                    <AccordionTrigger className='px-6 py-4 hover:bg-primary/5 text-lg'>
                      {question.heading}
                    </AccordionTrigger>
                    <AccordionContent className='px-6 py-4 text-muted-foreground text-base sm:text-lg'>
                      {question.content}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              ))}
            </div>
          </div>
        </main>

        <section className='mt-20 sm:mt-28 md:mt-32 lg:mt-40 grid md:grid-cols-2 gap-8'>
          <div className='relative'>
            <div className='relative bg-background p-8 rounded-2xl h-full border border-customBorder'>
              <h3 className='text-xl font-semibold mb-4'>New to Scribie?</h3>
              <p className='text-muted-foreground mb-8'>
                Get started with our guide to make the most of our transcription
                services
              </p>
              <Button
                onClick={() => router.push('/customer-guide')}
                variant='outline'
                className='w-full py-6 text-lg border-primary/20 hover:bg-primary/5 flex items-center justify-center gap-2'
              >
                <FileText className='w-5 h-5' />
                View Guide
              </Button>
            </div>
          </div>

          <div className='relative'>
            <div className='relative bg-background p-8 rounded-2xl h-full border border-customBorder'>
              <h3 className='text-xl font-semibold mb-4'>
                Still Have Questions?
              </h3>
              <p className='text-muted-foreground mb-8'>
                Can&apos;t find what you&apos;re looking for? Our support team
                is here to help you
              </p>
              <Button
                onClick={() => router.push('/contact')}
                className='w-full bg-primary text-primary-foreground hover:bg-primary/90 py-6 text-lg flex items-center justify-center gap-2'
              >
                <MessagesSquare className='w-5 h-5' />
                Contact Support
              </Button>
            </div>
          </div>
        </section>
      </div>
    </section>
  )
}
