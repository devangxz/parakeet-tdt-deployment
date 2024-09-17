import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ReactNode, useState } from 'react'
import { SmoothCorners as OriginalSmoothCornersWrapper } from 'react-smooth-corners'

interface SmoothCornersWrapperProps {
  corners: string
  borderRadius: string
  shadow?: string
  className?: string
  children?: ReactNode // Add this line to include the children prop
}

const SmoothCorners: React.FC<SmoothCornersWrapperProps> = (props) => (
  <OriginalSmoothCornersWrapper {...props} />
)

export default function TranscriptionCategories() {
  const router = useRouter()
  const [currentIndex, setCurrentIndex] = useState<number>(0)
  const services = [
    {
      src: '/assets/images/home/hammer.svg',
      title: 'Legal',
      size: 20,
      service: {
        title: 'Legal Transcription',
        description: 'For Legal Matters',
        MainDescription: () => (
          <div className='leading-[35px]'>
            Our transcribers are not only experts in transcription but are also{' '}
            <span className='text-amber-300'>
              specially trained in legal terminology & documentation standards.
              Custom legal formatting
            </span>{' '}
            options meet the specific requirements of legal documents, ensuring
            they are court-ready. We have been able to help court reporters and
            court reporting firms with deposition and courtroom transcription
            services.{' '}
            <Link className='text-white underline' target='_blank' href='https://scribie.com/samples/Scribie-Legal-Case-Study.pdf'>
              Case Study
            </Link>{' '}
          </div>
        ),
        imageSrc: '/assets/images/legal.jpg',
        Highlighter: () => (
          <span className='flex items-center gap-2'>
            <Image
              alt='AAERT'
              src='/assets/images/aaert.webp'
              width={120}
              height={55}
              className='rounded-[16px] bg-white'
            />
            <p className='text-white text-xl font-semibold'>
              We are now official sponsors of AAERT
            </p>{' '}
          </span>
        ),
        features: ["Team's Account", '24/7 support'],
        pricing: {
          price: 1.2,
          discountedPrice: 0.9,
          unit: 'audio min',
        },
        Testimonial: () => (
          <div className='flex flex-col items-center space-y-[2rem] px-7'>
            <div className='text-[1rem] md:text-base font-semibold leading-6 text-indigo-600'>
              Legal Testimonial
            </div>
            <div className='max-w-[800px] text-md font-medium text-center text-black text-opacity-30 md:text-2xl'>
              “I am a court reporter and use Scribie for deposition transcripts!
              It has been a game-changer for me. Saved me so much time and the
              accuracy and quick turnaround are amazing. I’ll be a lifetime
              customer as long as I’m working! Thanks so much 😊&quot;
            </div>

            <div className='flex gap-4 justify-center text-base font-semibold leading-6 text-black whitespace-nowrap'>
              <div className='grow my-auto'>Ginger Driden</div>
            </div>
          </div>
        ),
      },
    },
    {
      src: '/assets/images/home/dictionary.svg',
      title: 'Academic',
      size: 20,
      service: {
        title: 'Academic',
        description: 'Transcription Tailored for Academia.',
        MainDescription: () => (
          <div className='leading-[35px]'>
            Our transcription services are tailored for the academic sector,
            focusing on{' '}
            <span className='text-amber-300'>
              lectures and seminars, research interviews, focus groups,
              educational videos and podcasts, and classroom recordings.
            </span>{' '}
            Each transcription is crafted with essential elements of academic
            content.
          </div>
        ),
        imageSrc: '/assets/images/academic.jpeg',
        features: ["Team's Account", '24/7 support'],
        pricing: {
          price: 1.2,
          discountedPrice: 0.9,
          unit: 'audio min',
        },
        Testimonial: () => (
          <div className='flex flex-col items-center space-y-[2rem] px-7'>
            <div className='text-[1rem] md:text-base font-semibold leading-6 text-indigo-600'>
              Academic Testimonial
            </div>
            <div className='max-w-[800px] text-md font-medium text-center text-black text-opacity-30 md:text-2xl'>
              Very impressed that you got the names of the scholars&apos; named
              in the interview spelled correctly! Thanks for the great work!
            </div>

            <div className='flex gap-4 justify-center text-base font-semibold leading-6 text-black whitespace-nowrap'>
              <div className='grow my-auto'>Gwendolynne Reid</div>
            </div>
          </div>
        ),
      },
    },
    {
      src: '/assets/images/home/video.svg',
      title: 'Video',
      size: 20,
      service: {
        title: 'Video Transcription',
        description: 'For All Videos',
        MainDescription: () => (
          <div className='leading-[35px]'>
            Attention Video Producers: Elevate Your Earnings Potential!
            Integrate transcripts with your video offerings to enhance
            accessibility and viewer engagement. Our comprehensive transcription
            services handle all the details, ensuring your content reaches a
            broader audience and opens up new revenue streams.
          </div>
        ),
        imageSrc: '/assets/images/video-3.jpeg',
        features: ["Team's Account", '24/7 support'],
        pricing: {
          price: 1.2,
          discountedPrice: 0.9,
          unit: 'audio min',
        },
        Testimonial: () => (
          <div className='flex flex-col items-center space-y-[2rem] px-7'>
            <div className='text-[1rem] md:text-base font-semibold leading-6 text-indigo-600'>
              Video Testimonial
            </div>
            <div className='max-w-[800px] text-md font-medium text-center text-black text-opacity-30 md:text-2xl'>
              Wonderful work and attention to detail, and quick turnaround. The
              transcriber found the correct spelling of a cree phrase, got all
              names correctly by referencing the video description, and caught
              other small elements.
            </div>

            <div className='flex gap-4 justify-center text-base font-semibold leading-6 text-black whitespace-nowrap'>
              <div className='grow my-auto'>John Hampton</div>
            </div>
          </div>
        ),
      },
    },
    {
      src: '/assets/images/home/sermon.svg',
      title: 'Sermon',
      size: 20,
      service: {
        title: 'Sermon',
        description: 'For All Sermons',
        MainDescription: () => (
          <div className='leading-[35px]'>
            Transform your sermons into written form and make them{' '}
            <span className='text-amber-300'>
              accessible to a wider audience
            </span>{' '}
            with professional sermon transcription services. Preserve the wisdom
            of your sermons for future generations and allow your message to{' '}
            <span className='text-amber-300'>reach more people</span>.
          </div>
        ),
        imageSrc: '/assets/images/sermon-1.jpeg',
        features: ["Team's Account", '24/7 support'],
        pricing: {
          price: 1.2,
          discountedPrice: 0.9,
          unit: 'audio min',
        },
        Testimonial: () => (
          <div className='flex flex-col items-center space-y-[2rem] px-7'>
            <div className='text-[1rem] md:text-base font-semibold leading-6 text-indigo-600'>
              Sermon Testimonial
            </div>
            <div className='max-w-[800px] text-md font-medium text-center text-black text-opacity-30 md:text-2xl'>
              Thanks for reaching out. I’ve attached the North Point Ministries
              logo. Thanks for being a trusted business partner for so many
              years.
            </div>

            <div className='flex gap-4 justify-center text-base font-semibold leading-6 text-black whitespace-nowrap'>
              <div className='grow my-auto'>Katherine Volk</div>
            </div>
          </div>
        ),
      },
    },
    {
      src: '/assets/images/home/podcast.svg',
      title: 'Podcast',
      size: 20,
      service: {
        title: 'Podcast Transcription',
        description: 'For Legal Matters',
        MainDescription: () => (
          <div className='leading-[35px]'>
            Promote Your Podcast With Transcripts. Improve your reach and give
            your audience a better listening experience.
          </div>
        ),
        imageSrc: '/assets/images/podcast-1.jpeg',
        features: ['Accuracy', "Team's Account", '24/7 support'],
        pricing: {
          price: 1.2,
          discountedPrice: 0.9,
          unit: 'audio min',
        },
        Testimonial: () => (
          <div className='flex flex-col items-center space-y-[2rem] px-7'>
            <div className='text-[1rem] md:text-base font-semibold leading-6 text-indigo-600'>
              Podcast Testimonial
            </div>
            <div className='max-w-[800px] text-md font-medium text-center text-black text-opacity-30 md:text-2xl'>
              Thank you for the excellent work! Scanning through it now, I
              noticed I missed a few names, so I really appreciate you making
              sure to find the accurate spelling for everything!
            </div>

            <div className='flex gap-4 justify-center text-base font-semibold leading-6 text-black whitespace-nowrap'>
              <div className='grow my-auto'>David Margittai</div>
            </div>
          </div>
        ),
      },
    },
    {
      src: '/assets/images/home/marketing.svg',
      title: 'Marketing',
      size: 20,
      service: {
        title: 'Marketing',
        description: 'Elevate Your Marketing Strategy',
        MainDescription: () => (
          <div className='leading-[35px]'>
            <span className='text-amber-300'>Unlock the full potential</span> of
            your marketing campaigns with our transcription services for focus
            groups and market research interviews.{' '}
            <span className='text-amber-300'>
              Elevate your strategy and reach new heights.
            </span>
          </div>
        ),
        imageSrc: '/assets/images/video-3.jpeg',
        features: ["Team's Account", '24/7 support'],
        pricing: {
          price: 1.2,
          discountedPrice: 0.9,
          unit: 'audio min',
        },
        Testimonial: () => (
          <div className='flex flex-col items-center space-y-[2rem] px-7'>
            <div className='text-[1rem] md:text-base font-semibold leading-6 text-indigo-600'>
              Marketing Testomonial
            </div>
            <div className='max-w-[800px] text-md font-medium text-center text-black text-opacity-30 md:text-2xl'>
              Thank you – this is completely amazing! Thank you for the accuracy
              and fast turnaround and taking the time to get the places right
              too. Really grateful. With best wishes, Olivia
            </div>

            <div className='flex gap-4 justify-center text-base font-semibold leading-6 text-black whitespace-nowrap'>
              <div className='grow my-auto'>Olivia Lane-Nott</div>
            </div>
          </div>
        ),
      },
    },
    {
      src: '/assets/images/home/disertation.svg',
      title: 'Audio',
      size: 20,
      service: {
        title: 'Audio Transcription',
        description: 'Expert Transcription for All Your Audio Needs',
        MainDescription: () => (
          <div className='leading-[35px]'>
            Discover unparalleled accuracy with our audio transcription
            services, where{' '}
            <span className='text-amber-300'>
              expert transcribers bring precision to every word. From podcasts
              to interviews, our team ensures your content is transcribed with
              the utmost care and attention to detail.
            </span>{' '}
            Experience transcription that understands your needs, making every
            audio minute count.
          </div>
        ),
        imageSrc: '/assets/images/podcast-1.jpeg',
        features: ["Team's Account", '24/7 support'],
        pricing: {
          price: 1.2,
          discountedPrice: 0.9,
          unit: 'audio min',
        },
        Testimonial: () => (
          <div className='flex flex-col items-center space-y-[2rem] px-7'>
            <div className='text-[1rem] md:text-base font-semibold leading-6 text-indigo-600'>
              Audio Testimonial
            </div>
            <div className='max-w-[800px] text-md font-medium text-center text-black text-opacity-30 md:text-2xl'>
              Wonderful transcription. Scribie followed my instructions
              perfectly and had amazing accuracy for my poor audio quality.
            </div>

            <div className='flex gap-4 justify-center text-base font-semibold leading-6 text-black whitespace-nowrap'>
              <div className='grow my-auto'>Elli Wynter</div>
            </div>
          </div>
        ),
      },
    },
  ]
  const [selectedService, setSelectedService] = useState(services[0])
  return (
    <div className='flex flex-col items-center justify-center px-7 lg:px-[10%] mt-[4rem]'>
      <div className='w-full overflow-x-auto overflow-y-hidden hide-scroll-bar'>
        <div className='flex flex-nowrap justify-between gap-5 text-base font-semibold'>
          {services.map((service, index) => (
            <div
              key={index}
              className='w-fit flex-shrink-0'
            >
              <ServiceCard
                src={service.src}
                title={service.title}
                size={service?.size}
                onClick={() => {
                  setSelectedService(service);
                  setCurrentIndex(index);
                }}
                isSelected={selectedService.title === service.title}
              />
            </div>
          ))}
        </div>
      </div>
      <SmoothCorners
        corners='32'
        borderRadius='32px'
        className='flex flex-col lg:flex-row justify-between border-white px-[2rem] xl:px-[4rem] py-[2rem] lg:py-[3rem] mt-[2rem] mb-[4rem] bg-indigo-900 rounded-[32px] gap-3 lg:gap-[2rem]'
      >
        <div className='flex flex-col gap-y-12 w-full lg:w-[50%] border-white'>
          <div className='h-auto flex flex-col gap-y-4 text-3xl font-semibold text-white md:text-5xl'>
            <h2 className='sm:leading-[60px]'>{services[currentIndex]?.service?.title}</h2>
            <div className='text-lg text-white font-normal max-lg:max-w-full'>
              {services[currentIndex]?.service?.description}
            </div>
          </div>
          <div className='block lg:hidden w-full'>
            <Image
              alt={services[currentIndex]?.service?.title}
              loading='lazy'
              src={services[currentIndex]?.service?.imageSrc}
              className='rounded-[20px] object-cover w-full'
              width={1000}
              height={600}
              sizes="(max-width: 640px) 100vw, 50vw"
            />
          </div>
          <div className='flex flex-col h-auto justify-center text-md md:text-2xl text-white'>
            {services[currentIndex]?.service?.MainDescription()}
          </div>
          {/* {services[currentIndex]?.service?.HLink && (
          <div className=''>
            {services[currentIndex]?.service?.HLink?.()}
          </div>
        )} */}
          <div className='flex flex-col-reverse md:flex-row justify-center md:justify-start gap-5 md:gap-5'>
            <div
              onClick={() => router.push('/files/upload')}
              className='flex justify-center py-4 md:px-6 md:py-3 text-md font-semibold text-white border-white border-2 bg-indigo-900 rounded-[32px] md:w-fit cursor-pointer'
            >
              Upload File
            </div>
            <div className='flex items-center gap-1 md:gap-2.5 my-auto leading-8'>
              <div className='text-base md:text-lg whitespace-nowrap text-white text-opacity-50 space-x-1 md:space-x-2'>
                <span className='font-semibold text-teal-400'>@ $0.80</span>
                <span className='text-[10px] text-slate-400 line-through'>
                  $1.40
                </span>
              </div>
              <div className='text-sm text-white'>
                / audio min
              </div>
            </div>
          </div>
          {services[currentIndex]?.service?.Highlighter && (
            <div className='mt-2'>
              {services[currentIndex]?.service?.Highlighter?.()}
            </div>
          )}
        </div>
        <div className='hidden w-full lg:flex justify-end lg:w-[50%] lg:relative'>
          <Image
            alt={services[currentIndex]?.service?.title}
            loading='lazy'
            src={services[currentIndex]?.service?.imageSrc}
            className='rounded-[32px] object-cover w-full'
            width={443}
            height={636}
            sizes="(max-width: 640px) 100vw, 50vw"
          />
        </div>
      </SmoothCorners>
      {services[currentIndex]?.service?.Testimonial &&
        services[currentIndex]?.service?.Testimonial?.()}
    </div>
  )
}

interface ServiceCardProps {
  src: string
  title: string
  size: number
  onClick: () => void
  isSelected: boolean // Add this prop to indicate if the card is selected
}

function ServiceCard({
  src,
  title,
  size,
  onClick,
  isSelected,
}: ServiceCardProps) {
  const blueFilter =
    'invert(33%) sepia(95%) saturate(1352%) hue-rotate(221deg) brightness(91%) contrast(101%)'
  return (
    <div
      className={`flex gap-3 justify-center px-[1.5rem] py-3 border border-violet-100 rounded-[32px] cursor-pointer ${isSelected ? 'bg-[#eee9ff] text-[#6442ee]' : ''
        }`}
      onClick={onClick}
    >
      <Image
        loading='lazy'
        src={src}
        alt={title}
        width={size}
        height={size}
        className={isSelected ? 'filter' : ''}
        style={{ filter: isSelected ? blueFilter : '' }}
      />
      <div
        className={`my-auto text-[1rem] ${isSelected ? 'text-[#6442ee]' : ''}`}
      >
        {title}
      </div>
    </div>
  )
}
