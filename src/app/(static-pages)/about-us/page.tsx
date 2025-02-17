'use client'

import {
  Sparkles,
  Users,
  BrainCircuit,
  Globe2,
  Lightbulb,
  ArrowRight,
  Clock,
  MessageCircle,
  PlayCircle,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'

const stats = [
  {
    icon: Clock,
    value: '16+',
    label: 'Years of Excellence',
  },
  {
    icon: Users,
    value: '50K+',
    label: 'Expert Transcribers',
  },
  {
    icon: Globe2,
    value: '100%',
    label: 'Remote Team',
  },
]

const values = [
  {
    icon: BrainCircuit,
    title: 'Human-AI Synergy',
    description:
      'We combine human expertise with AI to deliver unmatched accuracy and quality',
  },
  {
    icon: Lightbulb,
    title: 'Continuous Innovation',
    description:
      "We're constantly improving our technology to deliver better results",
  },
  {
    icon: Globe2,
    title: 'Global Excellence',
    description:
      'Our remote-first culture brings together the best talent worldwide',
  },
]

const team = [
  {
    image: '/assets/images/about-us/rajiv.webp',
    name: 'Rajiv Poddar',
    role: 'Chief Technology Officer',
    bio: 'Rajiv is an Electronics and Telecommunications graduate from NIT Silchar, India. He joined Tata Consultancy Services (TCS), Delhi as a IT Analyst in August 1999 and worked there till 2003. In March 2003, Rajiv moved to Bangalore, India and joined Lucent Technologies where he worked for another 3 years. In 2006 he left Lucent to start his own venture and founded Scribie.com in 2008. Rajiv can be reached at rajiv@scribie.com.',
    linkedin: 'https://www.linkedin.com/in/rajivpoddar/',
  },
  {
    image: '/assets/images/about-us/yukti.webp',
    name: 'Yukti Yatish',
    role: 'Chief Executive Officer',
    bio: 'Yukti is an Electronics Engineering graduate from Visvesvaraya Technological University (VTU), India. She has worked at Nokia Siemens Networks, IBM and FInastra, Bangalore at various leadership positions. She has a strong background in Telecom and FInance domain and extensive hands-on expertise in software development as well customer support and escalation management. She can be reached at yukti@scribie.com.',
    linkedin: 'https://www.linkedin.com/in/yuktiyatish/',
  },
]

export default function Page() {
  const router = useRouter()

  return (
    <section>
      <div className='relative mx-auto max-w-7xl mt-16 sm:mt-20 md:mt-24 lg:mt-32 px-4 sm:px-6 lg:px-8 pb-10 lg:pb-20'>
        <header className='text-center mb-8 sm:mb-12 lg:mb-16'>
          <h1 className='text-4xl md:text-5xl lg:text-6xl font-bold text-foreground max-w-3xl lg:max-w-4xl mx-auto leading-tight md:leading-[1.3] lg:leading-[1.1]'>
            We blend human expertise with{' '}
            <span className='text-primary'>AI precision</span>
          </h1>

          <p className='mt-4 sm:mt-6 lg:mt-8 text-muted-foreground max-w-sm sm:max-w-xl lg:max-w-2xl mx-auto text-base sm:text-lg'>
            Since 2008, we&apos;ve been on a mission to make transcription
            accurate, accessible, and effortless for everyone.
          </p>
        </header>
        <div className='mt-4 sm:mt-6 lg:mt-8 grid grid-cols-1 md:grid-cols-3 gap-8'>
          {stats.map((stat, i) => (
            <div
              key={i}
              className='group relative flex flex-col items-center p-8 rounded-2xl bg-background backdrop-blur-sm border border-primary/20 hover:border-primary/40 transition-all duration-300 hover:-translate-y-1'
            >
              <div className='mb-4 p-3 bg-primary/10 rounded-xl transform transition-transform group-hover:scale-110'>
                <stat.icon className='w-8 h-8 text-primary' />
              </div>
              <p className='text-4xl font-bold text-primary mb-2'>
                {stat.value}
              </p>
              <p className='font-medium mb-1'>{stat.label}</p>
              <div className='absolute -z-10 inset-0 bg-gradient-to-br from-primary/5 to-secondary/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity' />
            </div>
          ))}
        </div>

        <section className='mt-20 sm:mt-28 md:mt-32 lg:mt-40 grid md:grid-cols-2 gap-16 items-center'>
          <div className='text-center md:text-start'>
            <div className='inline-flex items-center gap-2 px-3 sm:px-4 py-1 rounded-full bg-gradient-to-r from-secondary to-muted border border-secondary'>
              <Sparkles className='w-3 h-3 sm:w-4 sm:h-4 text-primary' />
              <span className='text-xs sm:text-sm font-medium text-primary'>
                Our Mission
              </span>
            </div>

            <h2 className='mt-3 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground max-w-xl sm:max-w-3xl lg:max-w-5xl mx-auto leading-tight sm:leading-[1.2] md:leading-[1.3] lg:leading-[1.1]'>
              <span className='text-primary'>Transcription made easy</span> with
              our refined product
            </h2>

            <p className='mt-4 sm:mt-6 lg:mt-8 text-muted-foreground max-w-sm sm:max-w-xl lg:max-w-2xl mx-auto text-base sm:text-lg'>
              We believe that every spoken word carries value. Our platform
              combines human expertise with AI precision to deliver transcripts
              that capture not just words, but context and meaning.
            </p>
          </div>
          <div className='relative'>
            <div className='absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent rounded-3xl' />
            <div className='relative bg-primary-foreground p-4 rounded-3xl shadow-xl border-2 border-primary/20'>
              <Image
                src='/assets/images/about-us/dashboard.webp'
                alt='Scribie platform interface'
                width={600}
                height={400}
                className='object-cover object-center w-full h-full rounded-2xl'
                sizes='(max-width: 768px) 100vw, 40vw'
                quality={90}
                loading='lazy'
                placeholder='blur'
                blurDataURL='data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDABQODxIPDRQSEBIXFRQdHx0fHRsdHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR3/2wBDAR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR3/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k='
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                }}
              />
            </div>
          </div>
        </section>

        <section className='mt-20 sm:mt-28 md:mt-32 lg:mt-40'>
          <div className='text-center mb-8 sm:mb-12 lg:mb-16'>
            <div className='inline-flex items-center gap-2 px-3 sm:px-4 py-1 rounded-full bg-gradient-to-r from-secondary to-muted border border-secondary'>
              <Sparkles className='w-3 h-3 sm:w-4 sm:h-4 text-primary' />
              <span className='text-xs sm:text-sm font-medium text-primary'>
                Our Core Values
              </span>
            </div>

            <h2 className='mt-3 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground max-w-xl sm:max-w-3xl lg:max-w-5xl mx-auto leading-tight sm:leading-[1.2] md:leading-[1.3] lg:leading-[1.1]'>
              Principles that drive us{' '}
              <span className='text-primary'>forward</span>
            </h2>

            <p className='mt-4 sm:mt-6 lg:mt-8 text-muted-foreground max-w-sm sm:max-w-xl lg:max-w-2xl mx-auto text-base sm:text-lg'>
              Our core values drive innovation and excellence in everything we
              do - from our AI-powered solutions to our global team of expert
              transcribers.
            </p>
          </div>

          <div className='grid md:grid-cols-3 gap-8'>
            {values.map((value, i) => (
              <div key={i} className='group relative'>
                <div className='absolute inset-0 bg-gradient-to-b from-primary to-primary/50 opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity duration-300' />
                <div className='relative bg-background p-8 rounded-2xl h-full transition-transform group-hover:-translate-y-2 border border-customBorder'>
                  <div className='w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-6'>
                    <value.icon className='w-6 h-6 text-primary' />
                  </div>
                  <h3 className='text-xl font-semibold mb-4'>{value.title}</h3>
                  <p className='text-muted-foreground'>{value.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <main className='mt-20 sm:mt-28 md:mt-32 lg:mt-40'>
          <div className='text-center mb-8 sm:mb-12 lg:mb-16'>
            <div className='inline-flex items-center gap-2 px-3 sm:px-4 py-1 rounded-full bg-gradient-to-r from-secondary to-muted border border-secondary'>
              <Sparkles className='w-3 h-3 sm:w-4 sm:h-4 text-primary' />
              <span className='text-xs sm:text-sm font-medium text-primary'>
                Core Team
              </span>
            </div>

            <h2 className='mt-3 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground max-w-xl sm:max-w-3xl lg:max-w-5xl mx-auto leading-tight sm:leading-[1.2] md:leading-[1.3] lg:leading-[1.1]'>
              The <span className='text-primary'>wizards</span> behind
            </h2>
          </div>

          <div className='grid md:grid-cols-2 gap-8'>
            {team.map((member, index) => (
              <div
                key={index}
                className='group bg-card rounded-2xl p-8 transition-all duration-300 hover:shadow-lg border border-customBorder hover:border-primary/20'
              >
                <div className='mb-8 relative'>
                  <Image
                    src={member.image}
                    alt={member.name}
                    width={132}
                    height={132}
                    className='relative mx-auto rounded-full border border-customBorder'
                    quality={90}
                    loading='lazy'
                    placeholder='blur'
                    blurDataURL='data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDABQODxIPDRQSEBIXFRQdHx0fHRsdHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR3/2wBDAR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR3/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k='
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                    }}
                  />
                </div>
                <h3 className='text-xl font-semibold mb-1'>{member.name}</h3>
                <p className='text-lg text-primary font-semibold mb-4'>{member.role}</p>
                <p className='text-muted-foreground mb-4 leading-relaxed'>
                  {member.bio}
                </p>
                <Link
                  href={member.linkedin}
                  target='_blank'
                  className='inline-flex items-center gap-2 text-primary hover:text-primary-dark transition-colors'
                >
                  <Image
                    src='/assets/images/Linkedin.svg'
                    alt='LinkedIn'
                    width={24}
                    height={24}
                  />
                  <span className='text-sm font-medium'>
                    Connect on LinkedIn
                  </span>
                  <ArrowRight className='w-4 h-4 group-hover:translate-x-1 transition-transform' />
                </Link>
              </div>
            ))}
          </div>
        </main>

        <div className='mt-20 sm:mt-28 md:mt-32 lg:mt-40 relative overflow-hidden bg-primary rounded-2xl p-6 sm:p-12'>
          <div className='relative text-center'>
            <h2 className='text-3xl sm:text-4xl font-bold text-primary-foreground mb-8'>
              Ready to experience better transcription?
            </h2>

            <div className='flex flex-col sm:flex-row justify-center gap-4'>
              <Button
                onClick={() => router.push('/contact')}
                className='bg-primary-foreground text-primary hover:bg-primary-foreground/90 text-lg px-8 py-6 space-x-2'
              >
                <MessageCircle className='w-5 h-5' />
                <span>Contact Us</span>
              </Button>
              <Button
                onClick={() => router.push('/get-demo')}
                className='bg-primary-dark text-primary-foreground hover:bg-primary-dark/90 text-lg px-8 py-6 space-x-2'
              >
                <PlayCircle className='w-5 h-5' />
                <span>Request Demo</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
