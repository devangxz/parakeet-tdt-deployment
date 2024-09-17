import Image from 'next/image'

// import cambridge
export default function Testimonials() {
  return (
    <div className='flex flex-col items-center px-7 xl:px-[10%] bg-violet-100'>
      <div className='flex justify-center items-center self-stretch py-5 w-full'>
        <div className='flex flex-col md:gap-14 my-12'>
          <div className='xl:w-[85%] self-center text-3xl font-semibold text-center leading-relaxed md:text-[2.75rem] md:leading-snug'>
            Over <span className='text-indigo-600'>10 million mins</span>{' '}
            transcribed with a 68 NPS from 94,000 customers
          </div>
          <div className='flex flex-col lg:flex-row gap-10 justify-center items-center mt-20 md:mt-7'>
            <div className='flex justify-center items-center gap-x-10'>
              <Image
                alt='Cambridge'
                loading='lazy'
                src='/assets/images/home/cambridge.png'
                className='object-contain'
                width={150}
                height={33}
              />
              <Image
                alt='Cambridge'
                loading='lazy'
                src='/assets/images/home/chicago.png'
                className='object-contain'
                width={150}
                height={33}
              />
            </div>
            <div className='flex justify-center items-center gap-x-10'>
              <Image
                alt='Cambridge'
                loading='lazy'
                src='/assets/images/home/xpro.png'
                className='object-contain'
                width={150}
                height={33}
              />
              <Image
                alt='Cambridge'
                loading='lazy'
                src='/assets/images/cintron.png'
                className='object-contain'
                width={150}
                height={33}
              />
            </div>
            <div className='flex justify-center items-center gap-x-10'>
              <Image
                alt='Cambridge'
                loading='lazy'
                src='/assets/images/beamazed.png'
                className='object-contain'
                width={150}
                height={33}
              />
              <Image
                alt='Creu'
                loading='lazy'
                src='/assets/images/creu.jpeg'
                className='object-contain'
                width={100}
                height={21}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
