'use client'

import Image from 'next/image'
import React from 'react'

interface Company {
  name: string
  image: string
  width: number
}

interface CompanyLogoProps {
  company: Company
}

const companies: Company[] = [
  {
    name: 'Cambridge',
    image: '/assets/images/home/partners/cambridge.webp',
    width: 180,
  },
  { name: 'Creu', image: '/assets/images/home/partners/creu.webp', width: 100 },
  {
    name: 'Chicago',
    image: '/assets/images/home/partners/chicago.webp',
    width: 180,
  },
  {
    name: 'Cintron',
    image: '/assets/images/home/partners/cintron.webp',
    width: 160,
  },
  {
    name: 'ProTrainings',
    image: '/assets/images/home/partners/pro-trainings.webp',
    width: 160,
  },
  {
    name: 'BeAmazed',
    image: '/assets/images/home/partners/beamazed.webp',
    width: 170,
  },
]

const CompanyLogo = ({ company }: CompanyLogoProps) => (
  <div className='flex-shrink-0 px-8 flex items-center justify-center h-32'>
    <div className='relative w-36 h-12 sm:w-48 sm:h-16 flex items-center justify-center'>
      <Image
        src={company.image}
        alt={`${company.name} logo`}
        width={company.width}
        height={Math.round(company.width * 0.6)}
        className={`object-contain w-auto h-auto max-w-full max-h-full ${
          company.name === 'Cambridge' || company.name === 'ProTrainings'
            ? 'dark:bg-white dark:p-2'
            : ''
        }`}
        priority={true}
        quality={75}
        sizes='(max-width: 768px) 144px, 192px'
        placeholder='blur'
        blurDataURL='data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDABQODxIPDRQSEBIXFRQdHx0fHRsdHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR3/2wBDAR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR3/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k='
      />
    </div>
  </div>
)

const Partners = () => (
  <section className='mt-24 flex justify-center'>
    <div className='w-full xl:max-w-screen-xl space-y-8'>
      <div className='relative flex justify-center'>
        <div className='w-full relative'>
          <div className='absolute inset-0 flex items-center'>
            <div className='w-full relative'>
              <div className='absolute w-full h-px -top-px opacity-20 bg-gradient-to-r from-transparent via-gray-300 to-transparent blur-sm' />
              <div className='w-full h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent' />
              <div className='absolute w-full h-px top-px opacity-30 bg-gradient-to-r from-transparent via-gray-300 to-transparent blur-sm' />
            </div>
          </div>
          <div className='relative flex justify-center'>
            <span className='px-6 bg-background text-sm font-semibold text-muted-foreground'>
              TRUSTED BY LEADING COMPANIES
            </span>
          </div>
        </div>
      </div>

      <div className='relative w-full'>
        <div className='absolute top-0 left-0 w-24 h-full bg-gradient-to-r from-background via-background to-transparent z-10' />
        <div className='absolute top-0 right-0 w-24 h-full bg-gradient-to-l from-background via-background to-transparent z-10' />

        <div className='relative overflow-hidden'>
          <div className='flex animate-marquee'>
            {companies.map((company, idx) => (
              <CompanyLogo key={`${company.name}-1-${idx}`} company={company} />
            ))}
            {companies.map((company, idx) => (
              <CompanyLogo key={`${company.name}-2-${idx}`} company={company} />
            ))}
          </div>
        </div>
      </div>
    </div>
  </section>
)

export default Partners
