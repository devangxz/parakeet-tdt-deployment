// `app/page.tsx` is the UI for the `/` URL
'use client'
import { usePathname } from 'next/navigation'
import { useRef } from 'react'

import { StaticContent } from '@/constants'

const sidebarItems = StaticContent.transcriberGuide

const content = [
  {
    id: 'intro',
    Content: () => (
      <div className='space-y-6' id='intro'>
        <div className='border-b pb-5 mb-5'>
          <h1 className='text-black font-semibold text-4xl'>
            <span className='font-semibold'>Transcriber Guide</span>
          </h1>
          <p className='text-slate-500'>
            All you need to know about our becoming a certified transcriber and
            working for us
          </p>
        </div>
        <div className='mb-3'>
          <h2 className='text-black text-xl'>Overview</h2>
        </div>
        <p className='text-slate-500'>
          Scribie offers a great opportunity to augment your income by
          transcribing audio files for us. The work involves listening to the
          audio files and typing it as accurately as possible. The job is fully
          remote and you can choose your files. We pay by the length of the
          audio file and the pay rate varies from $5 per audio hour to $20 per
          audio hour. We also provide a free automated transcript to make it
          easier for you. You just need to go through a test process to become
          certified as a transcriber.
        </p>
        <p className='text-slate-500'>
          After certification, you can be promoted to a Reviewer, Proofreader
          and QC on good performance. For each submission, your Scribie account
          will be credited with the appropriate dollar amount. We do not assign
          any files; you get to pick and choose your work. Earnings will
          accumulate in your account and you can transfer it to your PayPal
          account anytime. From PayPal, the funds can be transferred to your
          bank account. There are no monthly commitments or minimum withdrawal
          limits. Payments are made once a day.
        </p>
        <p className='text-slate-500'>
          If you are an experienced transcriber and have spare time, then
          Scribie.com can help you to fill that up. If you are starting your
          career as a transcriptionist then you can gain valuable experience and
          hone your skills.
        </p>
        <p className='text-slate-500'>
          We have been in business since 2008. We have transcribed more than 9M
          minutes and have more than 94K customers and 50K certified
          transcribers till date.
        </p>
        <p className='text-slate-500'>
          Our transcripts are of the highest quality, consistent,
          well-researched, and delivered punctually. We take the time to
          research difficult words, acronyms, place names, and other contextual
          information. If any portions of the audio are unclear, we mark them
          with a blank and provide timestamps, making it easy for you to
          cross-check with the original audio file.
        </p>
        <p className='text-slate-500'>
          We specialize in handling high-quality audio/video files with American
          speakers and offer the most affordable rates with high accuracy for
          such files. With over 8 million minutes transcribed since our
          establishment in 2008, we have a wealth of experience in the field.
        </p>
        <div className='mb-1'>
          <h2 className='text-black text-xl'>Requirements</h2>
        </div>
        <p className='text-slate-500'>
          The following are the requirements for this remote home-based job.
        </p>
        <ul className='list-disc pl-5 text-slate-500'>
          <li>Laptop or desktop computer</li>
          <li>Headphone or earphone</li>
          <li>Verified PayPal account</li>
          <li>Broadband connection</li>
          <li>Good comprehension of English</li>
          <li>Ability to interpret conversations</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'verified-payPal',
    Content: () => (
      <div className='pt-11 space-y-6' id='quick-start'>
        <div className='mb-3'>
          <h3 className='text-black text-xl'>Verified PayPal</h3>
        </div>
        <p className='text-slate-500'>
          We send payments via PayPal and we require a Verified PayPal account
          in order to be eligible for this program. It is a necessary
          requirement and cannot be relaxed. In order to verify your PayPal
          account, it has to be linked to a bank account and/or credit card
          depending upon your country. Please check the PayPal FAQ for the exact
          process. If you do not have a PayPal account already then please sign
          up for one and get it verified before applying. It is free to sign up
          for PayPal.
        </p>
        <p className='text-slate-500'>
          This requirement is specifically to ensure that you are able to
          receive the money when we transfer your earnings to your PayPal
          account. A Verified PayPal account indicates that you are able to
          successfully transfer your earnings to a bank account eventually. It
          also helps us save on support costs for payments related issues.
        </p>
        <p className='text-slate-500'>
          You can specify any PayPal account as long as it&apos;s Verified and not in
          use already. It can also be changed later on. The PayPal account is
          not used for any purpose other than funds transfer. We do not support
          any other payment methods currently.
        </p>
      </div>
    ),
  },
  {
    id: 'transcription-process',
    Content: () => (
      <div className='pt-11' id='payments'>
        <div className='mb-3'>
          <h3 className='text-black text-xl'>Transcription Process</h3>
        </div>
        <p className='text-slate-500'>
          We require payments to be made in advance via credit card and/or
          PayPal. Once the payment is processed, we promptly begin working on
          your file. As a bonus, we offer free credits for trial runs.
          Don&apos;t forget to{' '}
          <a
            href='/account/join-newsletter'
            className='text-blue-500 underline'
          >
            join our newsletter
          </a>{' '}
          to avail of our free credits.
        </p>
        <p className='text-slate-500'>
          Additionally, we offer billing and invoicing options for large orders.
          To set up a billing account, a contract must be executed. If you
          require further details, please feel free to{' '}
          <a
            href='/company/contact?subject=Billing Account'
            className='text-blue-500 underline'
          >
            contact us
          </a>
          .
        </p>
      </div>
    ),
  },
  {
    id: 'payments',
    Content: () => (
      <div className='pt-11' id='deliveries'>
        <div className='mb-3'>
          <h3 className='text-black text-xl'>Payments</h3>
        </div>
        <div className='mb-3' id='manual-deliveries'>
          <p className='text-slate-500'>
            Please note that the turnaround time provided is indicative and is
            an estimate, and there may be delays during holidays, weekends, or
            periods of high demand or backlog.
          </p>
          <p className='text-slate-500'>
            <a
              href='/help/customer-guide#additional-charges'
              className='text-blue-500 underline'
            >
              Additional charges
            </a>{' '}
            may apply for files with non-American accents, poor audio quality,
            distortions, distant speakers, high background and/or ambient noise.
            A full refund will be issued if the additional charges are
            unacceptable, or if the file is un-transcribeable.
          </p>
          <p className='text-slate-500'>
            For files longer than 3 hours, there may be a potential delay. To
            prevent this, we recommend considering file splitting. By trimming
            the file and selecting a suitable split point that maintains the
            conversation flow without interruption, each part can be kept under
            3 hours in length.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 'certification-process',
    Content: () => (
      <div className='pt-11' id='refunds'>
        <div className='mb-3'>
          <h3 className='text-black text-xl'>Certification Process</h3>
        </div>
        <p className='text-slate-500'>
          You can cancel your transcript order at any time before it reaches 60%
          completion (as indicated by the{' '}
          <a href='#progress' className='text-blue-500 underline'>
            progress percentage
          </a>
          ). If you choose to cancel, refunds will be issued proportionally,
          deducting the cost of the work already completed on each file. Refunds
          can be sent to your original payment method or credited to your
          account.
        </p>
        <p className='text-slate-500'>
          Once the transcript has been delivered, we do not offer refunds.
          However, if you find the transcript quality unsatisfactory or require
          additional changes, we provide free re-reviews. We are committed to
          achieving the promised 99%+ minimum accuracy and will redo the
          transcript as many times as necessary.
        </p>
        <p className='text-slate-500'>
          Please note that we do not offer refunds for blank portions in the
          audio file where there is no spoken audio. We recommend using audio
          editing software like{' '}
          <a
            href='http://www.audacityteam.org/'
            target='_blank'
            className='text-blue-500 underline'
          >
            Audacity
          </a>{' '}
          or utilizing the Trim Audio functionality on the files page to remove
          such portions.
        </p>
        <p className='text-slate-500'>
          Once the transcript has been delivered, we do not offer refunds. We
          also do not offer refunds for duplicate file orders placed in error.
          Please double-check your files to prevent unintentional duplication
          before proceeding with the order. However, if you find the transcript
          quality unsatisfactory or require additional changes, we provide free
          re-reviews. We are committed to achieving the promised 99%+ minimum
          accuracy and will redo the transcript as many times as necessary.
        </p>
      </div>
    ),
  },
  {
    id: 'guides-promotions',
    Content: () => (
      <div className='pt-11' id='custom-format'>
        <div className='mb-3'>
          <h3 className='text-black text-xl'>Guides and Promotions</h3>
        </div>
        <p className='text-slate-500'>
          Custom formatting is available upon request and is subject to an
          additional charge based on the specific requirements. The cost is
          determined by the complexity of the formatting and how much it
          deviates from the default format.
        </p>
        <p className='text-slate-500'>
          In case you need extra formatting on your transcript that deviates
          from our{' '}
          <a href='#default-format' className='text-blue-500 underline'>
            default formatting
          </a>
          , please enable the Custom Formatting option when placing your order.
          When enabled, we will apply your formatting requirements based on the
          instructions and sample output provided.
        </p>
        <p className='text-slate-500'>
          The first step when ordering custom formatting is to{' '}
          <a
            href='https://scribie.com/company/contact'
            target='_blank'
            className='text-blue-500 underline'
          >
            contact support
          </a>{' '}
          first so we can enable the custom plan for you. Please provide your
          custom formatting instructions and a sample output so we will be able
          to gauge the scope of work and estimate the additional charge. Once
          this step is done, you can now proceed with placing your order.
        </p>
        <p className='text-slate-500'>
          The custom formatting can be ordered in two ways, as follows:
        </p>
        <h3 className='text-black text-md my-2'>
          1) Simultaneous with Ordering the Transcript
        </h3>
        <p className='text-slate-500'>
          Once we have enabled the custom plan for you, you can already place
          your order (transcription + custom formatting) with us. When placing
          the order, after clicking on the Order Transcript button, you will be
          shown the optional features. Please enable Custom Formatting and the
          agreed-upon additional charge will be added to the transcription rate.
        </p>
        <h3 className='text-black text-md my-2'>
          2) After the Transcript is Delivered
        </h3>
        <p className='text-slate-500'>
          If you already ordered the transcripts and these are done, you can
          place the custom formatting order on the{' '}
          <a
            href='https://scribie.com/files/#delivered'
            target='_blank'
            className='text-blue-500 underline'
          >
            Delivered Files
          </a>{' '}
          page. Please click on the drop-down menu and select Custom Formatting.
          A custom formatting invoice will be generated based on the agreed-upon
          custom formatting rate.
        </p>
        <p className='text-slate-500'>
          If you already have the transcript and you want it to be custom
          formatted, you can also order it from us. Please email us (
          <a
            href='mailto:support@scribie.com'
            className='text-blue-500 underline'
          >
            support@scribie.com
          </a>
          ) your custom formatting instructions and sample files (input and
          output) and we will be happy to generate a custom formatting quote for
          you.
        </p>
      </div>
    ),
  },
  {
    id: 'guidelines',
    Content: () => (
      <div className='pt-11' id='editor'>
        <div className='mb-3'>
          <h3 className='text-black text-xl'>Guidelines</h3>
        </div>
        <p className='text-slate-500'>
          The Transcript Editor is an online tool which helps you quickly and
          efficiently check the transcript against the audio file. Click on the
          audio waveform and the cursor will be placed in the corresponding
          position of the transcript. Conversely, place the cursor in any
          position of the text and you can play the corresponding audio.
        </p>
        <p className='text-slate-500'>
          Additionally, you can also play from the start of paragraphs, check
          and edit any inaudible words which are time stamped and marked with a
          blank, and cycle through blanks. On Google Chrome, audio playback can
          also be sped up or slowed down to carefully examine difficult audio
          sections. Various keyboard shortcuts are also available to help you
          navigate without the mouse.
        </p>
        <p className='text-slate-500'>
          The Transcript Editor is packed with features and is a huge time-saver
          for assessing the accuracy of the transcript. We strongly recommend
          that you check the file before downloading and add those last
          finishing touches before using it for your end purpose.
        </p>
        <p className='text-slate-500'>
          Please also read{' '}
          <a
            href='https://scribie.com/blog/2014/05/how-to-review-transcripts-in-five-easy-steps/'
            className='text-blue-500 underline'
          >
            the Integrated Editor
          </a>{' '}
          blog post on how to use this tool and learn about keyboard shortcuts
          that can help you navigate its functions more efficiently.
        </p>
      </div>
    ),
  },
  {
    id: 'sample',
    Content: () => (
      <div className='pt-11' id='confidentiality'>
        <div className='mb-3'>
          <h3 className='text-black text-xl'>Sample</h3>
        </div>
        <p className='text-slate-500'>
          Maintaining the confidentiality of all transcription files is our
          utmost priority. Access to the files is strictly restricted on a
          need-to-know basis, limited to our employees and contractors. All
          transcribers, employees, and contractors are bound by a
          confidentiality clause outlined in the{' '}
          <a
            href='/company/transcriber-terms'
            className='text-blue-500 underline'
          >
            Terms &amp; Conditions
          </a>
          .
        </p>
        <p className='text-slate-500'>
          Furthermore, you have complete control over your files. Once you
          delete your files, they are permanently removed from our servers as we
          do not keep backups. You also have the option to delete your
          Scribie.com account at any time.
        </p>
        <p className='text-slate-500'>
          To further ensure confidentiality, we split up the files into smaller
          parts before distributing them to our transcribers. This way, they
          only have access to specific portions of the file. Our website also
          utilizes industry-standard 256-bit SSL encryption for secure
          communication between servers and browsers.
        </p>
        <p className='text-slate-500'>
          We strictly adhere to a no-selling, no-renting, and no-sharing policy
          for personal information with third parties. Our{' '}
          <a
            href='/company/privacy'
            className='text-blue-500 underline'
            title='Read our privacy policy'
          >
            Privacy Policy
          </a>{' '}
          covers all data uploaded to our servers, including transcripts. If you
          require a specific confidentiality agreement, please send the document
          to{' '}
          <a
            href='mailto:support@scribie.com'
            className='text-blue-500 underline'
            title='Send a mail to support'
          >
            support@scribie.com
          </a>
          , and we will provide you with a signed copy.
        </p>
        <p className='text-slate-500'>
          Please note that we are currently not HIPAA compliant.
        </p>
      </div>
    ),
  },
  {
    id: 'faq',
    Content: () => (
      <div className='pt-11' id='accuracy'>
        <div className='mb-3'>
          <h3 className='text-black text-xl'>FAQ</h3>
        </div>
        <div className='mb-3' id='manual-accuracy'>
          <p className='text-slate-500'>
            Our commitment to quality ensures a minimum standard of 99%+
            accuracy for all transcripts, that is, the transcripts are delivered
            only when this criterion is met. To achieve this, we follow a
            comprehensive{' '}
            <a
              href='#process'
              title='Learn more about our transcription process'
            >
              4-step transcription process
            </a>
            , involving multiple checks by different individuals. This
            collaborative approach with expert transcribers and proofreaders
            results in superior quality transcripts. We conduct thorough
            research for technical terms and acronyms and employ subject matter
            experts for Legal Transcription, Academic Transcription, Business
            Transcription, as well as accent experts for Indian, African, and
            other non-native accents.
          </p>
          <p className='text-slate-500'>
            Our philosophy is centered around continuously reworking the file
            until it meets our high-quality standards. With our dedicated
            Quality Assurance Team, carefully selected and trained members
            employ a structured process supported by efficient tools. Files
            requiring reworking are promptly identified, and the proofreading
            step is repeated with different proofreaders until 99%+ accuracy is
            achieved before delivery.
          </p>
          <p className='text-slate-500'>
            The accuracy of the transcript can be influenced by factors such as
            the audio file quality and difficulty level. Files with background
            noise, unclear speakers, or challenging accents may require
            additional time and effort to transcribe accurately. In such cases,
            the delivery time may extend to a few days up to one week or so
            instead of one day. If a file proves to be untranscribable, a full
            refund will be provided.
          </p>
          <p className='text-slate-500'>
            If the delivered transcript does not meet your satisfaction, you can
            request a free re-review. This can be done through your account,
            where you can provide specific instructions. The file will undergo
            another round of proofreading and be re-delivered within one
            business day.
          </p>
          <p className='text-slate-500'>
            Unlike our competitors who rely on a 2-step process that often falls
            short, our 4-step process is designed for scalability and consistent
            production of highly accurate transcripts.
          </p>
          <p className='text-slate-500'>
            Please note that refunds are not offered once the transcript has
            been delivered. However, you have the flexibility to cancel your
            transcript order at any time until it reaches 60% completion.
          </p>
        </div>
      </div>
    ),
  },
]

export default function Page() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const scrollToSection = (sectionId: string): void => {
    const element = document.getElementById(`section-${sectionId}`)
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }
  }
  const pathname = usePathname()

  return (
    <div className='flex flex-1 gap-8 w-[100%] px-[10%] m-auto py-[2rem] overflow-hidden'>
      {/* Adjust the sidebar container styles */}
      <div className='flex lg:flex-col space-x-0 space-y-1 min-w-[20%] overflow-y-auto'>
        {sidebarItems.map((item, index) => {
          const isActive = pathname === `${item.link}${content[index]?.id}`
          return (
            <div
              key={item.link}
              onClick={() => scrollToSection(`section-${item?.link}`)}
              className={`flex items-center gap-2.5 rounded-lg py-2 transition-all ${
                isActive ? 'text-primary bg-primary/10' : 'hover:text-primary'
              }`}
            >
              {item.name}
            </div>
          )
        })}
      </div>

      {/* Main content container (unchanged) */}
      <div
        ref={containerRef}
        className='flex space-x-2 lg:flex-col lg:space-x-0 lg:space-y-1 font-medium overflow-y-auto'
      >
        {content.map((item, index) => {
          const Content = item.Content
          return (
            <div key={index} id={`section-${item?.id}`}>
              <Content />
            </div>
          )
        })}
      </div>
    </div>
  )
}
