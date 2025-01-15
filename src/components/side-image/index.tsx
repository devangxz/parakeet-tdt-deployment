import { Clock, Users } from 'lucide-react'
import Image from 'next/image'

const SideImage = () => (
  <div className='hidden lg:block h-[calc(100vh-5rem)] sticky top-20'>
    <div className='absolute inset-0'>
      <Image
        alt='Backgroung image'
        src='/assets/images/side-image.webp'
        fill
        quality={90}
        priority
        sizes='(max-width: 768px) 100vw, 100vw'
        className='object-cover'
        placeholder='blur'
        blurDataURL='data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDABQODxIPDRQSEBIXFRQdHx0fHRsdHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR3/2wBDAR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR3/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k='
        onError={(e) => {
          const target = e.target as HTMLImageElement
          target.style.display = 'none'
        }}
      />
    </div>

    <div className='absolute inset-0 bg-gradient-to-b from-black/25 via-black/15 to-black/25' />

    <div className='relative h-full flex flex-col'>
      <div className='flex-1 pt-12 px-4'>
        <div className='max-w-[380px]'>
          <h1 className='text-[2.25rem] font-semibold leading-[1.3] tracking-tight mb-7 text-primary-foreground'>
            AI-powered transcription for your business.
          </h1>

          <div className='flex gap-3'>
            <div className='flex items-center gap-2 bg-black/15 backdrop-blur-[2px] px-3 py-2 rounded-lg border border-primary-foreground/10'>
              <Clock className='w-4 h-4 text-primary-foreground' />
              <div>
                <p className='text-lg font-semibold leading-none mb-0.5 text-primary-foreground'>
                  10M+
                </p>
                <p className='text-xs text-primary-foreground/90'>
                  Minutes Transcribed
                </p>
              </div>
            </div>

            <div className='flex items-center gap-2 bg-black/15 backdrop-blur-[2px] px-3 py-2 rounded-lg border border-primary-foreground/10'>
              <Users className='w-4 h-4 text-primary-foreground' />
              <div>
                <p className='text-lg font-semibold leading-none mb-0.5 text-primary-foreground'>
                  94K+
                </p>
                <p className='text-xs text-primary-foreground/90'>
                  Happy Customers
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className='w-full bg-black/15 backdrop-blur-[2px] border-t border-primary-foreground/10'>
        <div className='px-4 py-3 flex items-center gap-4'>
          <div className='bg-primary-foreground rounded p-1.5'>
            <Image
              alt='AAERT'
              src='/assets/images/aaert.webp'
              width={80}
              height={36}
              className='rounded'
              quality={80}
              priority
              placeholder='blur'
              blurDataURL='data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDABQODxIPDRQSEBIXFRQdHx0fHRsdHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR3/2wBDAR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR3/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k='
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
              }}
            />
          </div>
          <div>
            <p className='text-base font-medium text-primary-foreground'>
              We are now official sponsors of AAERT
            </p>
            <p className='text-sm text-primary-foreground/90'>
              American Association of Electronic Reporters And Transcribers
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
)

export default SideImage
