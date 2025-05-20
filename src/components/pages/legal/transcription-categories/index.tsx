'use client'

import { ArrowRight, Star, Check, Sparkles } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

const TranscriptionCategories = () => {
  const router = useRouter()

  const features = [
    'Legal Terminology Expert',
    'Court Documentation Ready',
    'Deposition Transcripts',
    'AAERT',
  ]

  return (
    <section className='mt-16 sm:mt-20 md:mt-20 lg:mt-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
      <div className='grid grid-cols-12 gap-8'>
        <div className='col-span-12 lg:col-span-7 space-y-8'>
          <div className='space-y-4'>
            <div className='inline-flex items-center gap-2 px-3 sm:px-4 py-1 rounded-full bg-gradient-to-r from-secondary to-muted border border-secondary'>
              <Sparkles className='w-3 h-3 sm:w-4 sm:h-4 text-primary' />
              <span className='text-xs sm:text-sm font-medium text-primary'>
                Premium Legal Service
              </span>
            </div>

            <h1 className='text-3xl sm:text-4xl font-bold text-foreground'>
              Legal Transcription
            </h1>

            <p className='text-muted-foreground text-base sm:text-lg'>
              Our transcribers are not only experts in transcription but are
              also specially trained in legal terminology & documentation
              standards. Custom legal formatting options meet the specific
              requirements of legal documents, ensuring they are court-ready. We
              have been able to help court reporters and court reporting firms
              with deposition and courtroom transcription services. Our team
              maintains strict confidentiality and security protocols for all
              legal documents.
            </p>
          </div>

          <div className='grid sm:grid-cols-2 gap-5'>
            {features.map((feature, index) => (
              <div key={index} className='flex items-center'>
                <div className='w-8 h-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0'>
                  <Check className='w-5 h-5 text-primary' />
                </div>
                <div className='ml-2'>
                  <span className='font-medium text-foreground'>{feature}</span>
                </div>
              </div>
            ))}
          </div>

          <div className='bg-secondary rounded-2xl p-[22px] border border-customBorder'>
            <div className='flex gap-1 mb-4'>
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className='w-5 h-5 text-yellow-400 fill-current'
                />
              ))}
            </div>
            <blockquote className='text-muted-foreground italic mb-10'>
              &ldquo;I am a court reporter and use Scribie for deposition
              transcripts. The accuracy and quick turnaround save me so much
              time. I will be a lifetime customer! 😊&rdquo;
            </blockquote>
            <div className='flex items-center gap-4 mb-0.5'>
              <div className='w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-semibold'>
                G
              </div>
              <div>
                <div className='font-semibold text-foreground'>Ginger</div>
                <div className='text-sm text-muted-foreground mb-1'>
                  Court Reporter
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className='col-span-12 lg:col-span-5'>
          <div className='sticky top-8 space-y-6'>
            <div className='rounded-2xl overflow-hidden shadow-xl'>
              <div className='aspect-[5/4] relative'>
                <Image
                  src={
                    '/assets/images/home/transcription-categories/legal.webp'
                  }
                  alt={'Legal Transcription'}
                  width={750}
                  height={600}
                  className='object-cover object-center w-full h-full'
                  sizes='(max-width: 768px) 100vw, 40vw'
                  quality={80}
                  loading='lazy'
                  placeholder='blur'
                  blurDataURL='data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDABQODxIPDRQSEBIXFRQdHx0fHRsdHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR3/2wBDAR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR3/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k='
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.style.display = 'none'
                  }}
                />
                <div className='absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent' />
              </div>
            </div>

            <div className='bg-background rounded-2xl border border-customBorder overflow-hidden'>
              <div className='p-6'>
                <div className='flex items-baseline gap-2 mb-4'>
                  Starting at
                  <span className='text-3xl font-bold text-primary'>$0.80</span>
                  <span className='text-sm'>/min (transcription only)</span>
                </div>
                <button
                  onClick={() => router.push('/files/upload')}
                  className='w-full bg-primary text-primary-foreground py-3 rounded-xl font-medium hover:bg-primary/90 transition-all duration-300 flex items-center justify-center gap-2 group'
                >
                  Upload File
                  <ArrowRight className='w-4 h-4 transform group-hover:translate-x-1 transition-transform' />
                </button>
              </div>
              <div className='bg-secondary px-6 py-4 border-t border-customBorder'>
                <div className='flex items-center gap-2 text-sm text-primary'>
                  <Star className='w-4 h-4 fill-current' />
                  <span>
                    Additional charges apply based on selected
                    formatting/template
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default TranscriptionCategories
