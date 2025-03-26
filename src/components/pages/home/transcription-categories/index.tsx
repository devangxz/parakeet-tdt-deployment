'use client'

import {
  Gavel,
  GraduationCap,
  Video,
  Church,
  Mic2,
  Presentation,
  Headphones,
  ArrowRight,
  Star,
  Check,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import React, { useState, useRef, useEffect } from 'react'

const services = [
  {
    id: 'legal',
    icon: <Gavel size={24} />,
    title: 'Legal',
    description: 'For Legal Matters',
    longDescription:
      'Our transcribers are not only experts in transcription but are also specially trained in legal terminology & documentation standards. Custom legal formatting options meet the specific requirements of legal documents, ensuring they are court-ready. We have been able to help court reporters and court reporting firms with deposition and courtroom transcription services. Our team maintains strict confidentiality and security protocols for all legal documents.',
    price: '$0.80',
    originalPrice: '$1.40',
    image: '/assets/images/home/transcription-categories/legal.webp',
    features: [
      'Legal Terminology Expert',
      'Court Documentation Ready',
      'Deposition Transcripts',
      'AAERT Standards',
    ],
    testimonial: {
      text: 'I am a court reporter and use Scribie for deposition transcripts. The accuracy and quick turnaround save me so much time. I will be a lifetime customer! 😊',
      author: 'Ginger',
      role: 'Court Reporter',
    },
  },
  {
    id: 'academic',
    icon: <GraduationCap size={24} />,
    title: 'Academic',
    description: 'Transcription Tailored for Academia',
    longDescription:
      'Our transcription services are tailored for the academic sector, focusing on lectures and seminars, research interviews, focus groups, educational videos and podcasts, and classroom recordings. Each transcription is crafted with essential elements of academic content, ensuring accurate technical terminology, proper citations, and clear speaker identification throughout the document. We deliver high-quality transcripts that meet rigorous academic standards.',
    price: '$0.80',
    originalPrice: '$1.40',
    image: '/assets/images/home/transcription-categories/academic.webp',
    features: [
      'Research Interviews',
      'Lecture & Seminar',
      'Focus Group Sessions',
      'Classroom Recordings',
    ],
    testimonial: {
      text: "Very impressed that you got all the scholars' names mentioned in the interview spelled correctly! Thank you for the great work!",
      author: 'Gwendolynne',
      role: 'Academic Researcher',
    },
  },
  {
    id: 'video',
    icon: <Video size={24} />,
    title: 'Video',
    description: 'For All Videos',
    longDescription:
      'Attention Video Producers: Elevate Your Earnings Potential! Integrate transcripts with your video offerings to enhance accessibility and viewer engagement. Our comprehensive transcription services handle all the details, ensuring your content reaches a broader audience and opens up new revenue streams. With our expert transcription team, you can focus on creating amazing content while we handle the text.',
    price: '$0.80',
    originalPrice: '$1.40',
    image: '/assets/images/home/transcription-categories/video.webp',
    features: [
      'Video Subtitles',
      'Enhanced Accessibility',
      'Time-Stamped',
      'Multi-Language',
    ],
    testimonial: {
      text: 'Wonderful work and attention to detail, and quick turnaround. The transcriber found the correct spelling of a cree phrase, got names and caught small elements.',
      author: 'John',
      role: 'Video Producer',
    },
  },
  {
    id: 'sermon',
    icon: <Church size={24} />,
    title: 'Sermon',
    description: 'For All Sermons',
    longDescription:
      'Transform your sermons into written form and make them accessible to a wider audience with professional sermon transcription services. Preserve the wisdom of your sermons for future generations and allow your message to reach more people. Our expert transcriptionists ensure accurate, word-for-word transcripts that capture every spiritual insight and biblical reference. Share your message with confidence and inspire your congregation today.',
    price: '$0.80',
    originalPrice: '$1.40',
    image: '/assets/images/home/transcription-categories/sermon.webp',
    features: [
      'Scripture References',
      'Speaker Attribution',
      'Custom Formatting',
      'Archive Ready',
    ],
    testimonial: {
      text: 'Thanks for reaching out. Thanks for being a trusted business partner for so many wonderful years.',
      author: 'Katherine',
      role: 'Ministry Coordinator',
    },
  },
  {
    id: 'podcast',
    icon: <Mic2 size={24} />,
    title: 'Podcast',
    description: 'For Podcast Content',
    longDescription:
      "Promote Your Podcast With Transcripts. Improve your reach and give your audience a better listening experience with accurate, professional transcriptions. Our expert team ensures every word is captured perfectly, making your content more accessible and SEO-friendly. Transform your audio content into valuable written assets that expand your podcast's impact and drive meaningful audience engagement.",
    price: '$0.80',
    originalPrice: '$1.40',
    image: '/assets/images/home/transcription-categories/podcast.webp',
    features: [
      'Multiple Speakers',
      'Show Notes',
      'SEO Optimized',
      'Time Stamps',
    ],
    testimonial: {
      text: 'Thank you for the excellent work! While scanning through it, I noticed I had missed a few names, so I really appreciate you ensuring accurate spelling throughout!',
      author: 'David',
      role: 'Podcast Host',
    },
  },
  {
    id: 'marketing',
    icon: <Presentation size={24} />,
    title: 'Marketing',
    description: 'Elevate Your Marketing Strategy',
    longDescription:
      'Unlock the full potential of your marketing campaigns with our transcription services for focus groups and market research interviews. Elevate your strategy and reach new heights. Our skilled transcriptionists deliver accurate, detailed transcripts of your marketing sessions, focus groups and interviews, ensuring you capture every valuable insight and customer feedback. Get clear, organized transcripts ready for immediate analysis and action.',
    price: '$0.80',
    originalPrice: '$1.40',
    image: '/assets/images/home/transcription-categories/marketing.webp',
    features: [
      'Focus Group Transcripts',
      'Market Research Data',
      'Campaign Insights',
      'Strategy Enhancement',
    ],
    testimonial: {
      text: 'Thank you – this is completely amazing! Thank you for the accuracy,fast turnaround, and taking the time to get the places right too. Really grateful.',
      author: 'Olivia',
      role: 'Marketing Director',
    },
  },
  {
    id: 'audio',
    icon: <Headphones size={24} />,
    title: 'Audio',
    description: 'Expert Transcription for All Your Audio Needs',
    longDescription:
      'Discover unparalleled accuracy with our audio transcription services, where expert transcribers bring precision to every word. From podcasts to interviews, our team ensures your content is transcribed with the utmost care and attention to detail. Experience transcription that understands your needs, making every audio minute count. Let our professional team deliver exceptional quality for all your transcription requirements.',
    price: '$0.80',
    originalPrice: '$1.40',
    image: '/assets/images/home/transcription-categories/audio.webp',
    features: [
      'Unparalleled Accuracy',
      'Expert Transcribers',
      'Precise Word Capture',
      'Detailed Attention',
    ],
    testimonial: {
      text: 'Wonderful transcription. Scribie followed my instructions perfectly and had amazing accuracy for my poor audio quality.',
      author: 'Elli',
      role: 'Content Creator',
    },
  },
]

const TranscriptionCategories = () => {
  const router = useRouter()
  const [activeService, setActiveService] = useState(services[0])
  const [showLeftScroll, setShowLeftScroll] = useState(false)
  const [showRightScroll, setShowRightScroll] = useState(false)
  const scrollContainerRef = useRef(null)

  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } =
        scrollContainerRef.current
      setShowLeftScroll(scrollLeft > 0)
      setShowRightScroll(scrollLeft < scrollWidth - clientWidth - 10)
    }
  }

  useEffect(() => {
    checkScroll()
    window.addEventListener('resize', checkScroll)
    return () => window.removeEventListener('resize', checkScroll)
  }, [])

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current as HTMLDivElement
      const scrollAmount = 200
      container.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      })
    }
  }

  return (
    <section className='mt-16 sm:mt-24 md:mt-28 lg:mt-36 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
      <div className='relative mb-8 sm:mb-12 lg:mb-16'>
        <div className='relative'>
          <button
            onClick={() => scroll('left')}
            className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-8 h-8 bg-background shadow-lg rounded-full flex items-center justify-center text-primary transition-opacity duration-200 lg:hidden
              ${
                showLeftScroll ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
          >
            <ChevronLeft className='w-5 h-5' />
          </button>

          <button
            onClick={() => scroll('right')}
            className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-8 h-8 bg-background shadow-lg rounded-full flex items-center justify-center text-primary transition-opacity duration-200 lg:hidden
              ${
                showRightScroll
                  ? 'opacity-100'
                  : 'opacity-0 pointer-events-none'
              }`}
          >
            <ChevronRight className='w-5 h-5' />
          </button>

          <div className='relative flex items-center justify-center overflow-hidden'>
            <div
              ref={scrollContainerRef}
              onScroll={checkScroll}
              className='flex overflow-x-auto scrollbar-hide lg:justify-center gap-2 p-2 bg-secondary rounded-2xl'
            >
              {services.map((service) => (
                <button
                  key={service.id}
                  onClick={() => setActiveService(service)}
                  className={`
                    flex items-center px-3 py-1.5 rounded-xl transition-all duration-300
                    whitespace-nowrap flex-shrink-0 
                    ${
                      activeService.id === service.id
                        ? 'bg-primary text-primary-foreground shadow-md scale-105'
                        : 'hover:bg-secondary'
                    }
                  `}
                >
                  <span
                    className={`
                      flex items-center justify-center w-8 h-8 rounded-lg
                      ${
                        activeService.id === service.id
                          ? 'bg-primary-foreground/20 text-primary-foreground'
                          : 'bg-secondary text-primary'
                      }
                    `}
                  >
                    {service.icon}
                  </span>
                  <span className='ml-2.5 font-medium'>{service.title}</span>
                </button>
              ))}
            </div>
          </div>

          <div className='absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent pointer-events-none lg:hidden'></div>
          <div className='absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none lg:hidden'></div>
        </div>
      </div>

      <div className='grid grid-cols-12 gap-8'>
        <div className='col-span-12 lg:col-span-7 space-y-8'>
          <div className='space-y-4'>
            <div className='inline-flex items-center gap-2 px-3 sm:px-4 py-1 rounded-full bg-gradient-to-r from-secondary to-muted border border-secondary'>
              <Sparkles className='w-3 h-3 sm:w-4 sm:h-4 text-primary' />
              <span className='text-xs sm:text-sm font-medium text-primary'>
                Premium {activeService.title} Service
              </span>
            </div>

            <h1 className='text-3xl sm:text-4xl font-bold text-foreground'>
              {activeService.title} Transcription
            </h1>

            <p className='text-muted-foreground text-base sm:text-lg'>
              {activeService.longDescription}
            </p>
          </div>

          <div className='grid sm:grid-cols-2 gap-5'>
            {activeService.features.map((feature, index) => (
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
            <blockquote className='text-muted-foreground italic mb-6'>
              &ldquo;{activeService.testimonial.text}&rdquo;
            </blockquote>
            <div className='flex items-center gap-4'>
              <div className='w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-semibold'>
                {activeService.testimonial.author[0]}
              </div>
              <div>
                <div className='font-semibold text-foreground'>
                  {activeService.testimonial.author}
                </div>
                <div className='text-sm text-muted-foreground'>
                  {activeService.testimonial.role}
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
                  src={activeService.image}
                  alt={activeService.title}
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
                  <span className='text-3xl font-bold text-primary'>
                    {activeService.price}
                  </span>
                  <span className='text-lg text-muted-foreground line-through'>
                    {activeService.originalPrice}
                  </span>
                  <span className='text-sm text-muted-foreground'>/minute</span>
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
                  <span>Top-rated service</span>
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
