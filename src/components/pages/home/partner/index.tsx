import Image from 'next/image'
import Link from 'next/link'

export default function Partner() {
  return (
    <div className='flex flex-col items-center justify-center'>
      <div className='flex flex-col gap-y-10 md:gap-y-16 items-center justify-center px-7 xl:px-[10%] my-[4rem]'>
        <div className='text-3xl md:text-5xl font-semibold text-center whitespace-nowrap leading-[72.16px] text-neutral-900'>
          Get started
        </div>
        <div className='flex gap-10 flex-col md:items-start md:flex-row px-5 w-full'>
          <div className='flex flex-col items-center text-center text-black md:w-full'>
            <Image
              loading='lazy'
              src='/assets/images/home/upload-file.svg'
              alt='Upload'
              width={72}
              height={72}
            />
            <h3 className='mt-4 text-2xl font-semibold'>Upload</h3>
            <p className='max-w-[300px] mt-4 text-lg'>
              Upload or import any type of spoken audio/video files
            </p>
          </div>

          <div className='flex flex-col items-center text-center text-black md:w-full'>
            <Image
              loading='lazy'
              src='/assets/images/home/wallet.svg'
              alt='Pay'
              width={72}
              height={72}
            />
            <h3 className='mt-4 text-2xl font-semibold'>Pay</h3>
            <p className='max-w-[300px] mt-4 text-lg'>
              Pay using any credit card or PayPal
            </p>
          </div>

          <div className='flex flex-col items-center text-center text-black md:w-full'>
            <Image
              loading='lazy'
              src='/assets/images/home/download.svg'
              alt='Download'
              width={72}
              height={72}
            />
            <h3 className='mt-4 text-2xl font-semibold'>Download</h3>
            <p className='max-w-[300px] mt-4 text-lg'>
              Use our online editor to quickly check and download transcripts
            </p>
          </div>
        </div>
        <Link
          href='/signin'
          className='flex w-fit gap-2.5 justify-center px-6 py-4 text-md font-semibold leading-5 text-white whitespace-nowrap bg-indigo-600 rounded-[32px]'
        >
          <Image
            alt='Upload Files For Free'
            loading='lazy'
            src='/assets/images/home/upload.svg'
            className='w-5 aspect-square'
            width={5}
            height={5}
          />
          <div className='grow'>Upload Files For Free</div>
        </Link>
      </div>

      <div className='flex flex-col gap-y-10 md:gap-y-16 justify-center items-center px-7 xl:px-[10%] py-[4rem] w-full bg-violet-100'>
        <div className='text-3xl md:text-5xl font-semibold text-center whitespace-nowrap leading-[72.16px] text-neutral-900'>
          What you get with us
        </div>
        <div className='flex gap-10 flex-col md:items-start md:flex-row px-5 w-full'>
          <div className='flex flex-col items-center text-center text-black md:w-full'>
            <Image
              loading='lazy'
              src='/assets/images/home/tag.svg'
              alt='Best prices'
              width={60}
              height={60}
            />
            <h3 className='mt-4 text-2xl font-semibold'>Best prices</h3>
            <p className='max-w-[300px] mt-4 text-lg'>
              Best industry wise pricing with no compromise on quality
            </p>
          </div>

          <div className='flex flex-col items-center text-center text-black md:w-full'>
            <Image
              loading='lazy'
              src='/assets/images/home/human.svg'
              alt='Human verified'
              width={60}
              height={60}
            />
            <h3 className='mt-4 text-2xl font-semibold'>Human verified</h3>
            <p className='max-w-[300px] mt-4 text-lg'>
              With over 50K+ certified transcribers
            </p>
          </div>

          <div className='flex flex-col items-center text-center text-black md:w-full'>
            <Image
              loading='lazy'
              src='/assets/images/transcript.svg'
              alt='Accurate Transcript'
              width={60}
              height={60}
            />
            <h3 className='mt-4 text-2xl font-semibold'>99% Accuracy</h3>
            <p className='max-w-[300px] mt-4 text-lg'>
              For any queries small or big, we got your back
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
