// `app/page.tsx` is the UI for the `/` URL
'use client'
import { Pencil, ShoppingCart, Upload, Menu } from 'lucide-react'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { LegacyRef, useRef, useState } from 'react'

import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { StaticContent } from '@/constants'
const sidebarItems = StaticContent.faq['customer-guide']

const content = [
  {
    id: 'intro',
    Content: () => (
      <div id='intro'>
        <br />
        <div className='border-b pb-5 mb-5'>
          <h1 className='text-black font-semibold text-4xl'>
            <span className='font-semibold'>Customer Guide</span>
          </h1>
          <br />
          <p className='text-slate-500'>
            All you need to know about using our transcription and formatting
            services.
          </p>{' '}
          <br />
        </div>
        <div className='mb-3'>
          <h2 className='text-black text-xl'>Welcome to Scribie</h2>
          <br />
        </div>
        <p className='text-slate-500'>
          Thank you for your interest in our services. At Scribie, we provide
          top-notch transcription and formatting services tailored for various
          industries.
        </p>
        <br />
        <p className='text-slate-500'>
          Scribie simplifies the process of obtaining high-quality transcripts
          for your audio/video files. It&apos;s as easy as uploading your files,
          selecting the file(s) you want to order, and making the payment. Once
          the transcription is done, you can then download the transcripts from
          your account in formats such as Microsoft Word (.docx), Adobe PDF
          (.pdf), and plain text (.txt) files.
        </p>
        <br />
        <p className='text-slate-500'>
          Our team of certified transcribers/editors, who work from home,
          meticulously prepare timecoded transcripts (see a{' '}
          <a className='text-blue-500 underline' href='/customer-guide#sample'>
            sample
          </a>
          ) using our reliable human-verified{' '}
          <a className='text-blue-500 underline' href='/customer-guide#process'>
            transcription process
          </a>
          , ensuring high accuracy. You can even{' '}
          <a
            className='text-blue-500 underline'
            href='/customer-guide#progress'
          >
            check the transcript
          </a>{' '}
          as it is being prepared. In case you require further revisions, we
          also offer{' '}
          <a
            className='text-blue-500 underline'
            href='/customer-guide#re-reviews'
          >
            free re-review
          </a>{' '}
          of the delivered transcripts.
        </p>
        <br />
        <p className='text-slate-500'>
          Whether you need interview transcription, webinar transcription,
          podcast transcription, sermon transcription, focus group
          transcription, lecture transcription, legal transcription, or video
          transcription, we have the expertise to handle it all. Our services
          cover both general transcription and specialized transcription for
          academic, legal, and business purposes.
        </p>
        <br />
        <p className='text-slate-500'>
          Our transcripts are of the highest quality, consistent,
          well-researched, and delivered punctually. We take the time to
          research difficult words, acronyms, place names, and other contextual
          information. If any portions of the audio are unclear, we mark them
          with a blank and provide timestamps, making it easy for you to
          cross-check with the original audio file.
        </p>
        <br />
        <p className='text-slate-500'>
          We specialize in handling high-quality audio/video files with
          American-accented speakers and offer the most affordable rates with
          high accuracy for such files. With over 10 million minutes transcribed
          since our establishment in 2008, we have a wealth of experience in the
          field.
        </p>
        <br />
      </div>
    ),
  },
  {
    id: 'quick-start',
    Content: () => (
      <div className='pt-0' id='quick-start'>
        <div className='mb-3'>
          <h3 className='text-black text-xl'>Quick Start</h3>
        </div>
        <br />
        <div className='container space-y-6'>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-7'>
            <div className='text-center mb-7'>
              <div className='relative min-h-40 mb-2'>
                <span className='text-success text-5xl mt-7 inline-block'>
                  <i className='fas fa-upload'>
                    <Upload className='text-primary' size={80} />
                  </i>
                </span>
              </div>
              <h3 className='text-black text-xl'>Step 1</h3>
              <p className='text-slate-500'>
                Upload or import audio/video files
              </p>
            </div>
            <div className='text-center mb-7'>
              <div className='relative min-h-40 mb-2'>
                <span className='text-primary text-5xl mt-7 inline-block'>
                  <i className='fas fa-shopping-cart'>
                    <ShoppingCart className='text-primary' size={80} />
                  </i>
                </span>
              </div>
              <h3 className='text-black text-xl'>Step 2</h3>
              <p className='text-slate-500'>Pay with Credit card or PayPal</p>
            </div>
            <div className='text-center'>
              <div className='relative min-h-40 mb-2'>
                <span className='text-danger text-5xl mt-7 inline-block'>
                  <i className='fas fa-edit'>
                    <Pencil className='text-primary' size={80} />
                  </i>
                </span>
              </div>
              <h3 className='text-black text-xl'>Step 3</h3>
              <p className='text-slate-500'>Check and download transcript</p>
            </div>
          </div>
        </div>
        <p className='text-slate-500'>
          If you upload files as a guest, an account will be created for you
          with the email address supplied during payment. You can monitor the
          progress of your files, view the draft transcript, download the
          transcripts, manage payment methods, or order more files from your
          account.
        </p>
      </div>
    ),
  },
  {
    id: 'payments',
    Content: () => (
      <div className='pt-0' id='payments'>
        <div className='mb-3'>
          <h3 className='text-black text-xl'>Payments</h3>
        </div>{' '}
        <br />
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
        </p>{' '}
        <br />
        <p className='text-slate-500'>
          Additionally, we offer billing and invoicing options for large orders
          (more than $1000/month). To set up a billing account, a contract must
          be executed. If you require further details, please feel free to{' '}
          <a href='/contact' className='text-blue-500 underline'>
            contact us
          </a>
          .
        </p>{' '}
      </div>
    ),
  },
  {
    id: 'deliveries',
    Content: () => (
      <div className='pt-0' id='manual-deliveries'>
        <div className='mb-3'>
          <h3 className='text-black text-xl'>Delivery Policy</h3>
        </div>{' '}
        <br />
        <div className='mb-3'>
          <p className='text-slate-500'>
            Please note that the turnaround time provided is indicative and is
            an estimate, and there may be delays during holidays, weekends, or
            periods of high demand or backlog.
          </p>{' '}
          <br />
          <p className='text-slate-500'>
            <a href='/customer-guide' className='text-blue-500 underline'>
              Additional charges
            </a>{' '}
            may apply for files with non-American accents, poor audio quality,
            distortions, distant speakers, high background and/or ambient noise.
            A full refund will be issued if the additional charges are
            unacceptable, or if the file is untranscribable.
          </p>{' '}
          <br />
          <p className='text-slate-500'>
            For files longer than 3 hours, there may be a potential delay. To
            prevent this, we recommend considering file splitting. By trimming
            the file and selecting a suitable split point that maintains the
            conversation flow without interruption, each part can be kept under
            3 hours in length.
          </p>{' '}
          <br />
        </div>
      </div>
    ),
  },
  {
    id: 'refunds',
    Content: () => (
      <div className='pt-0' id='refunds'>
        <div className='mb-3'>
          <h3 className='text-black text-xl'>Refund Policy</h3>
        </div>
        <p className='text-slate-500'>
          You can cancel your transcript order at any time before an Editor
          starts proofreading the file. Once proofreading has started, the
          Cancel Order option will no longer be available in the drop-down menu.
          If you choose to cancel, we will issue a full refund for the canceled
          file. Refunds can be sent to your original payment method or credited
          to your account.
        </p>
        <br />
        <p className='text-slate-500'>
          Please note that we do not offer refunds for sections of the audio
          file that are blank or contain no spoken content. We recommend using
          audio editing software like{' '}
          <a
            className='text-blue-500 underline'
            href='http://www.audacityteam.org/'
          >
            Audacity
          </a>{' '}
          or utilizing the Trim Audio feature on the files page to remove such
          portions.
        </p>
        <br />
        <p className='text-slate-500'>
          Once the transcript has been delivered, we do not offer refunds. We
          also do not offer refunds for duplicate files ordered in error. Please
          double-check your files to prevent unintentional duplication before
          proceeding with the order.
        </p>
        <br />
        <p className='text-slate-500'>
          However, if you find the transcript quality unsatisfactory, we provide
          free re-reviews. We are committed to achieving the promised 99%+
          minimum accuracy and will redo the transcript as many times as
          necessary to achieve this accuracy level.
        </p>
      </div>
    ),
  },
  {
    id: 'cancellations',
    Content: () => (
      <div className='pt-0' id='cancellations'>
        <div className='mb-3'>
          <h3 className='text-black text-xl'>Cancellations</h3>
        </div>
        <p className='text-slate-500'>
          You can cancel your transcript order at any time before the
          proofreading step starts. If you decide to cancel, a refund will be
          processed within 1 business day. Once a file is canceled, we will
          issue a full refund for the file. Additionally, upon cancelation, you
          can download the draft transcript, if available, as a text file from
          your account.
        </p>
        <br />
        <p className='text-slate-500'>
          Once the transcript has been delivered, we do not offer refunds.
          However, we provide{' '}
          <a
            href='/customer-guide#re-reviews'
            className='text-blue-500 underline'
          >
            free re-reviews
          </a>{' '}
          to address any quality concerns you may have.
        </p>
      </div>
    ),
  },
  {
    id: 'editor',
    Content: () => (
      <div className='pt-0' id='editor'>
        <div className='mb-3'>
          <h3 className='text-black text-xl'>Integrated Editor</h3>
        </div>
        <p className='text-slate-500'>
          The Integrated Editor is an online tool that helps you quickly and
          efficiently check the transcript against the audio file. Click on the
          audio waveform and the cursor will be placed in the corresponding
          position of the transcript. Conversely, place the cursor in any
          position of the text and you can play the corresponding audio.
        </p>{' '}
        <br />
        <p className='text-slate-500'>
          Additionally, you can also play from the start of paragraphs, check
          and edit any inaudible words that are timestamped and marked with a
          blank, and cycle through blanks. On Google Chrome, audio playback can
          also be sped up or slowed down to carefully examine difficult audio
          sections. Various keyboard shortcuts are also available to help you
          navigate without the mouse.
        </p>{' '}
        <br />
        <p className='text-slate-500'>
          The Integrated Editor is packed with features and is a huge time-saver
          for assessing the accuracy of the transcript. We strongly recommend
          that you check the file before downloading and add those last
          finishing touches before using it for your end purpose.
        </p>{' '}
        <br />
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
    id: 'confidentiality',
    Content: () => (
      <div className='pt-0' id='confidentiality'>
        <div className='mb-3'>
          <h3 className='text-black text-xl'>Confidentiality</h3>
        </div>
        <p className='text-slate-500'>
          Maintaining the confidentiality of all transcription files is our
          utmost priority. Access to the files is strictly restricted on a
          need-to-know basis, and limited to our employees and contractors. All
          transcribers, employees, and contractors are bound by a
          confidentiality clause outlined in the{' '}
          <a href='/terms' className='text-blue-500 underline'>
            Terms &amp; Conditions
          </a>
          .
        </p>{' '}
        <br />
        <p className='text-slate-500'>
          Furthermore, you have complete control over your files. Once you
          delete your files, they are permanently removed from our servers as we
          do not keep backups. You also have the option to delete your
          Scribie.com account at any time.
        </p>{' '}
        <br />
        <p className='text-slate-500'>
          Our website also utilizes industry-standard 256-bit SSL encryption for
          secure communication between servers and browsers.
        </p>{' '}
        <br />
        <p className='text-slate-500'>
          We strictly adhere to a no-selling, no-renting, and no-sharing policy
          for personal information with third parties. Our{' '}
          <a
            href='/privacy-policy'
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
        </p>{' '}
        <br />
        <p className='text-slate-500'>
          Please note that we are currently not HIPAA compliant.
        </p>
      </div>
    ),
  },
  {
    id: 'accuracy',
    Content: () => (
      <div className='pt-0' id='accuracy'>
        <div className='mb-3'>
          <h3 className='text-black text-xl'>Accuracy</h3>
        </div>
        <div className='mb-3'>
          <p className='text-slate-500'>
            Our commitment to quality ensures a minimum standard of 99%+
            accuracy for all transcripts, that is, the transcripts are delivered
            only when this criterion is met. To achieve this, we utilize
            state-of-the-art Automatic Speech Recognition (ASR) technology for
            the initial transcription, followed by a human-in-the-loop process
            to ensure the highest quality. This collaborative approach,
            leveraging advanced ASR tools for the initial draft and then having
            our expert human editors and proofreaders review and refine the
            transcripts, ensures superior-quality transcripts.
          </p>{' '}
          <br />
          <p className='text-slate-500'>
            We conduct thorough research for technical terms and acronyms and
            employ subject matter experts for Legal Transcription, Academic
            Transcription, and Business Transcription, as well as accent experts
            for Indian, African, and other non-native accents.
          </p>{' '}
          <br />
          <p className='text-slate-500'>
            Our philosophy is centered around continuously reworking the file
            until it meets our high-quality standards. With our dedicated
            Quality Assurance Team, carefully selected and trained members
            employ a structured process supported by efficient tools. Files
            requiring reworking are promptly identified, and the proofreading
            step is repeated with different editors/proofreaders until 99%+
            accuracy is achieved before delivery.
          </p>{' '}
          <br />
          <p className='text-slate-500'>
            The accuracy of the transcript can be influenced by factors such as
            the audio file quality and difficulty level. Files with background
            noise, unclear speakers, or challenging accents may require
            additional time and effort to transcribe accurately. In such cases,
            the delivery time may extend to a few days up to one week or so
            instead of one day. If a file proves to be untranscribable, a full
            refund will be provided.
          </p>
          <br />
          <p className='text-slate-500'>
            If the delivered transcript does not meet your satisfaction, you can
            request a{' '}
            <a
              className='text-blue-500 underline'
              href='/customer-guide#re-reviews'
            >
              free re-review
            </a>
            . This can be done through your account, where you can provide
            specific instructions. The file will undergo another round of
            proofreading and be re-delivered within one business day.
          </p>
          <br />
          <p className='text-slate-500'>
            Please note that refunds are not offered once the transcript has
            been delivered. However, you have the flexibility to cancel your
            transcript order at any time until the proofreading step starts.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 're-reviews',
    Content: () => (
      <div className='pt-0' id='re-reviews'>
        <div className='mb-3'>
          <h3 className='text-black text-xl'>Free Re-reviews</h3>
        </div>
        <br />
        <p className='text-slate-500'>
          We understand that sometimes the quality of a transcript may not meet
          your expectations, that&apos;s why we offer free re-reviews. If
          you&apos;re unsatisfied with the quality after delivery, you can place
          a re-review order from your account. Please provide specific
          instructions, and we will proofread the file once more and send it
          back to you. The re-review process takes approximately 1 business day.
        </p>
        <br />
        <p className='text-slate-500'>
          Customer satisfaction is our priority, and we take feedback seriously.
          When you place a re-review order, we thoroughly investigate the root
          causes of any issues and take necessary measures to prevent them from
          happening again in the future.
        </p>
        <br />
        <p className='text-slate-500'>
          Please note that we do not provide refunds after the transcript has
          been delivered. However, you can cancel your transcript order at any
          time before the proofreading step starts.
        </p>
      </div>
    ),
  },
  {
    id: 'teams',
    Content: () => (
      <div className='pt-0' id='teams'>
        <div className='mb-3'>
          <h3 className='text-black text-xl'>Teams</h3>
        </div>
        <br />
        <p className='text-slate-500'>
          The Teams feature is a versatile collaboration tool suitable for
          various types of organizations, whether they are large entities like
          universities or law firms, or small teams associated with podcasters,
          YouTubers, or videographers.a
        </p>
        <br />
        <p className='text-slate-500'>
          To utilize this feature, you can navigate to the{' '}
          <a href='/account/settings#teams' className='text-blue-500 underline'>
            settings page
          </a>{' '}
          of your account and create a team. Once created, you can invite
          multiple members to join your team and assign each one different roles
          depending on the access level you want them to have. This enables you
          to securely share files with team members without disclosing your
          password.
        </p>
        <br />
        <p className='text-slate-500'>
          When you are a part of one or more teams, you can easily switch
          between your private workspace and the team workspaces by using the
          dropdown button on the file page. Switching to a team workspace grants
          you access to various actions such as uploading files, ordering
          transcripts, reviewing and editing transcripts, viewing invoices,
          adding credits, and more within the context of the team workspace. All
          uploaded files and transcripts within the team workspace are shared
          with all team members, except for the team member with a limited-user
          role. Additionally, important email notifications are sent to all team
          members as well.
        </p>
        <br />
        <p className='text-slate-500'>
          The person who creates the team holds administrative privileges and
          can manage team membership by adding or removing members. They are
          also the only ones authorized to add a payment method for the team.
        </p>
        <p className='text-slate-500'>
          It&apos;s important to note that your private workspace remains
          exclusive to you and is not shared with other members of the team(s)
          you may be a part of.
        </p>
        <br />
        <p className='text-slate-500'>
          In addition, you have the flexibility to create multiple teams from
          the same account. Members of each team can only access their
          respective workspaces and do not have access to the workspaces of
          other teams.
        </p>
        <br />
        <p className='text-slate-500'>
          Please also visit the{' '}
          <a
            href='/blog/2023/01/introducing-team-workspaces/'
            className='text-blue-500 underline'
          >
            Team Workspaces blog
          </a>{' '}
          post for more information about this feature.
        </p>
      </div>
    ),
  },
  {
    id: 'folder-structure',
    Content: () => (
      <div className='pt-0' id='folder-structure'>
        <div className='mb-3'>
          <h3 className='text-black text-xl'>Folder feature</h3>
        </div>
        <br />
        <p className='text-slate-500'>
          The Folders feature is a powerful organizational tool that allows you
          to better manage your files and documents. You can use it to group
          related files and folders together and quickly access them whenever
          you need them.
        </p>
        <br />
        <p className='text-slate-500'>
          To get started with Folders, simply navigate to the
          <a className='text-blue-500 underline' href='/files/all-files'>
            All Files
          </a>{' '}
          page of your account and click on the &quot;New Folder&quot; button.
          You can then name your folder and click the Create folder button.
        </p>
        <br />
        <p className='text-slate-500'>
          Once you have created your folder, you can easily drag and drop files
          into it, or move existing files into the folder using the
          &quot;Move&quot; option in the toolbar menu. You can also create
          subfolders within your main folder to further organize your files.
        </p>
        <br />
        <p className='text-slate-500'>
          The Upload Folder feature allows you to quickly and easily upload
          large numbers of files to your account. You can either drag and drop a
          zipped folder or click on the &quot;Upload&quot; button on the{' '}
          <a className='text-blue-500 underline' href='/files/upload'>
            Uploads
          </a>{' '}
          page to select the zipped folder from your computer. You can also drag
          and drop the zipped folder on the{' '}
          <a className='text-blue-500 underline' href='/files/all-files'>
            All Files
          </a>{' '}
          page.
        </p>
        <p className='text-slate-500'>
          Please note that by default, folders are private and can only be
          accessed by the account holder. Your private files will remain private
          and cannot be accessed by other users.
        </p>
        <br />
        <p className='text-slate-500'>
          For more information and screenshots on how to use this feature,
          please visit the{' '}
          <a
            className='text-blue-500 underline'
            href='https://scribie.com/blog/2023/05/introducing-the-scribie-folder-feature/'
          >
            Scribie Folder Feature
          </a>{' '}
          blog post.
        </p>
      </div>
    ),
  },
  {
    id: 'account-credits',
    Content: () => (
      <div className='pt-0' id='account-credits'>
        <div className='mb-3'>
          <h3 className='text-black text-xl'>Account Credits</h3>
        </div>
        <br />
        <p className='text-slate-500'>
          Account credits are funds that you can add to your Scribie account and
          use to pay for transcript orders, formatting orders, or any other
          payments on Scribie. Your credit card will be charged only once. You
          can add anywhere from $10 to $15,000 at a time. Account credits can
          also be shared with team members and they do not expire. However,
          account credits cannot be withdrawn or transferred. You can only use
          them for payments on Scribie.
        </p>
        <br />
        <p className='text-slate-500'>
          You can{' '}
          <a href='/settings/credits' className='text-blue-500 underline'>
            add credits
          </a>{' '}
          from the settings page. You can also choose to send any refunds to
          your account credits from the settings page.
        </p>
      </div>
    ),
  },
  {
    id: 'transcription-process',
    Content: () => (
      <div className='pt-0' id='transcription-process'>
        <div className='mb-3'>
          <h3 className='text-black text-xl'>Transcription Process</h3>
        </div>
        <br />
        <p className='text-slate-500'>
          Our transcription process combines the latest AI technology with our
          industry-leading human-in-the-loop expertise to maximize efficiency,
          making it an unbeatable proposition for our valued customers.
        </p>
        <br />
        <p className='text-slate-500'>
          We utilize cutting-edge ASR technology to generate the initial draft,
          which is then refined and proofread by our expert editors. For orders
          requiring custom formatting for legal files, we include an additional
          step where the specific formatting and style guidelines provided by
          the customer are applied. Finally, our finalizers review the content
          and formatting to ensure that the files are thoroughly
          quality-checked, consistent, and meet the highest standards.
        </p>
        <br />
        <p className='text-slate-500'>
          Our philosophy is to keep re-working the transcript until the{' '}
          <a
            href='/customer-guide#accuracy'
            className='text-blue-500 underline'
          >
            quality standard of 99%+ accuracy
          </a>{' '}
          is achieved. The following is an illustration of our process.
        </p>
        <br />
        <div className='flex justify-center my-8'>
          <Image
            src='/assets/images/transcription-process.png'
            alt="Scribie's transcription and formatting process diagram"
            width={800}
            height={400}
            className='max-w-full h-auto'
            priority
          />
        </div>
        <p className='text-slate-500'>
          Our online transcription system manages all of the above stages. All
          our transcribers are home-based freelancers who have gone through our
          certification process and are paid on an hourly basis for their work.
          The system monitors their performance and handles the payments made to
          them. We provide them with efficient transcription and formatting
          tools and comprehensive guidelines for transcription and formatting.
          These guidelines are strictly enforced, and their performance is
          evaluated.
        </p>
        <br />
        <p className='text-slate-500'>
          We have rethought the audio transcription process for the internet age
          and designed our audio transcription system from scratch to deliver
          high-quality transcripts with minimal cost and effort. Our system and
          service have a proven track record, with over 10 million minutes
          transcribed to date. Here are some unique features provided by our
          system:
        </p>
        <br />
        <ul className='list-disc pl-5 text-slate-500'>
          <li>
            You can track the progress of your order and check the draft
            transcript anytime.
          </li>
          <li>
            Collaborative team on each file, resulting in higher transcript
            quality. The proofreading step and QA step are repeated, if needed,
            until the minimum accuracy we guarantee is met.
          </li>
          <li>
            Consistent and repeatable results due to a common set of guidelines.
          </li>
        </ul>
        <br />
        <p className='text-slate-500'>
          Our system is unique and can be best described as a{' '}
          <a
            className='text-blue-500 underline'
            href='http://scribie.com/blog/2012/09/mturk-for-audio-transcription/'
          >
            Mechanical Turk for audio transcription.
          </a>{' '}
          You can learn more about our transcription system in detail through a
          series of posts on our{' '}
          <a
            className='text-blue-500 underline'
            href='http://scribie.com/blog/category/transcription-system-2/'
          >
            Transcription System
          </a>{' '}
          blog category.
        </p>
      </div>
    ),
  },
  {
    id: 'transcript-format',
    Content: () => (
      <div className='pt-0' id='transcript-format'>
        <div className='mb-3'>
          <h3 className='text-black text-xl'>Transcript Format</h3>
        </div>
        <br />
        <p className='text-slate-500'>
          We offer two types of formatting for delivered transcripts. The first
          is our default formatting, which includes timecoding, speaker
          tracking, and the speaker&apos;s dialogue. The second is custom
          formatting, where we adjust the content based on your style guidelines
          and templates.
        </p>
      </div>
    ),
  },
  {
    id: 'default-format',
    Content: () => (
      <div className='pt-0' id='default-format'>
        <div className='mb-3'>
          <h3 className='text-black text-xl'>Default Format</h3>
        </div>
        <br />
        <p className='text-slate-500'>
          The text of the transcript is broken into paragraphs, with each
          speaker&apos;s diction transcribed on a new paragraph. New paragraphs
          are started at every change of speaker or every 3 minutes, whichever
          occurs earlier.
        </p>
        <br />
        <p className='text-slate-500'>
          We provide audio timecoding and speaker tracking by default. If the
          names of speakers are provided or mentioned in the audio, we use them.
          Otherwise, we use &quot;Speaker 1,&quot; &quot;Speaker 2,&quot; and so
          on. For an illustration of the formatting, you can check the{' '}
          <a
            className='text-blue-500 underline'
            href='/customer-guide#sample-transcript'
          >
            sample transcript
          </a>
          . For monologues, the speaker name or &quot;Speaker 1&quot; is used
          throughout. Monologues are also broken into paragraphs approximately
          every 3 minutes.
        </p>
        <br />
        <p className='text-slate-500'>
          You have the option to disable both audio timecoding and speaker
          tracking when ordering or downloading the transcript. The transcript
          does not include any speech analysis symbols.
        </p>
        <br />
        <p className='text-slate-500'>
          By default, the transcripts are clean verbatim, omitting utterances
          (e.g., &quot;mm-hmmn,&quot; &quot;uh-huh,&quot; &quot;um,&quot;
          &quot;uh&quot;), fillers (e.g., &quot;you know,&quot;
          &quot;like,&quot; &quot;right,&quot; &quot;so&quot;), interjections,
          and false starts. However, when the Strict Verbatim option is enabled,
          everything is included.
        </p>
        <br />
        <p className='text-slate-500'>
          You can specify the spelling style along with your order. We currently
          support American, British, Australian, and Canadian English spelling
          styles. If not specified, the spelling style is automatically chosen
          based on your current location. If you have different requirements or
          need more options, please contact us.
        </p>
      </div>
    ),
  },
  {
    id: 'custom-format',
    Content: () => (
      <div className='pt-0' id='custom-format'>
        <div className='mb-3'>
          <h3 className='text-black text-xl'>Custom Format</h3>
        </div>
        <p className='text-slate-500'>
          Custom formatting is available upon request and is subject to an
          additional charge based on the specific requirements. The cost is
          determined by the complexity of the formatting and how much it
          deviates from the default format.
        </p>
        <br />
        <p className='text-slate-500'>
          In case you need extra formatting on your transcript that deviates
          from our{' '}
          <a
            className='text-blue-500 underline'
            href='customer-guide#default-format'
          >
            default formatting
          </a>
          , please select the Format option when placing your order. When Format
          is selected as the order type, we will transcribe the file and then
          apply the formatting requirements based on the instructions or
          guidelines and sample output provided.
        </p>
        <br />
        <p className='text-slate-500'>
          The first step in ordering custom formatting is to{' '}
          <a
            href='/contact'
            target='_blank'
            className='text-blue-500 underline'
          >
            contact
          </a>{' '}
          support with your specific formatting instructions and sample output.
          This allows us to assess the scope of work and provide an estimate for
          any additional charges. Once we agree on the custom formatting rate,
          we will configure your account accordingly. After this setup is
          complete, you can proceed with placing your order.
        </p>
        <br />
        <p className='text-slate-500'>
          If you already have the transcript and you want it to be custom
          formatted, you can also order it from us. Please email us at{' '}
          <a
            className='text-blue-500 underline'
            href='mailto:support@scribie.com'
          >
            support@scribie.com
          </a>{' '}
          with your custom formatting instructions and sample files (input and
          output) and we will be happy to generate a custom formatting quote for
          you.
        </p>
      </div>
    ),
  },
  {
    id: 'transcript-file-formats',
    Content: () => (
      <div className='pt-0' id='transcript-file-formats'>
        <div className='mb-3'>
          <h3 className='text-black text-xl'>Transcript File Formats</h3>
        </div>
        <p className='text-slate-500'>
          The transcript files are delivered in the following formats:
        </p>
        <br />
        <ul className='list-disc pl-5 text-slate-500'>
          <li>Microsoft Word (.doc)</li>
          <li>Adobe PDF (.pdf)</li>
          <li>Plain text (.txt)</li>
        </ul>
        <br />
        <p className='text-slate-500'>
          A{' '}
          <a
            className='text-blue-500 underline'
            href='/customer-guide#transcript-template'
          >
            template file
          </a>{' '}
          is used for conversion for the first three formats. The plain text
          file contains only the transcript in UTF-8 encoded text.
        </p>
      </div>
    ),
  },
  {
    id: 'additional-charges',
    Content: () => {
      const issues = [
        { issue: 'Ambient Noise', examples: 'hiss, line noise, static' },
        {
          issue: 'Noisy Environment',
          examples:
            'street, bar, restaurant or other loud noises in background',
        },
        { issue: 'Distant Speakers', examples: 'faint, distant voices' },
        {
          issue: 'Accented Speakers',
          examples:
            'British, Australian, Indian, Hispanic, any other non-American',
        },
        { issue: 'Audio Breaks', examples: 'bad phone line, audio gaps' },
        {
          issue: 'Disturbances',
          examples:
            'loud typing sounds, rustling, wind howling, breathing sounds',
        },
        {
          issue: 'Distortion',
          examples: 'volume distortion, shrill voices, clipping',
        },
        {
          issue: 'Unclear Speakers',
          examples: 'muttering, volume variation, frequent overlaps',
        },
        {
          issue: 'Echo',
          examples: 'reverberation, same voice can be heard twice',
        },
        {
          issue: 'Quality',
          examples:
            'low sampling/bit rate, bad conference line, recorded off speakers',
        },
        {
          issue: 'Diction',
          examples: 'slurring, rapid speaking, unnatural pronunciation',
        },
        {
          issue: 'Muffled',
          examples: 'hidden or obstructed microphone, vintage tapes',
        },
        {
          issue: 'Blank',
          examples:
            'only music, only background conversation, only non-English',
        },
      ]
      return (
        <div className='pt-0' id='additional-charges'>
          <div className='mb-3'>
            <h3 className='text-black text-xl'>Additional Charges</h3>
          </div>
          <p className='text-slate-500'>
            Our rates and turnaround times are based on files with clean audio
            and American speakers. However, for files with the following issues,
            an additional charge of $0.50/minute to $1.00/minute may apply,
            along with a potential delay in delivery.
          </p>
          <br />
          <table className='min-w-full bg-white shadow-md rounded-lg overflow-hidden'>
            <thead className='bg-gray-200 text-gray-600 uppercase text-sm leading-normal'>
              <tr>
                <th className='py-3 px-6 text-left'>Issue</th>
                <th className='py-3 px-6 text-left'>Examples</th>
              </tr>
            </thead>
            <tbody className='text-gray-600 text-sm font-light'>
              {issues.map((item, index) => (
                <tr
                  key={index}
                  className='border-b border-gray-200 hover:bg-gray-100'
                >
                  <td className='py-3 px-6 text-left whitespace-nowrap'>
                    {item.issue}
                  </td>
                  <td className='py-3 px-6 text-left'>{item.examples}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <br />
          <p className='text-slate-500'>
            The additional charge is NOT applied automatically and can be
            declined. Please note that additional charges are non-negotiable and
            final. According to our{' '}
            <a href='/terms' className='text-blue-500 underline'>
              terms
            </a>{' '}
            of service, our assessment is final and binding, and any
            disagreement will result in immediate order cancelation.
          </p>
          <br />
          <p className='text-slate-500'>
            Based on our data, files with any of the listed issues require
            approximately 3 to 4 times more effort to ensure 100% accuracy.
            Compensating our transcribers for the additional time and effort is
            the most efficient approach to achieving our goal. Our system is
            optimized for clean files with American speakers, providing the best
            accuracy-to-price ratio for such files.
          </p>
          <br />
          <p className='text-slate-500'>
            For recommendations on how to avoid these charges, please refer to
            our{' '}
            <a
              className='text-blue-500 underline'
              href='/customer-guide#recording-tips'
            >
              recording tips
            </a>
            . You can also read our manifesto for a broader understanding of the
            reasoning behind this policy.
          </p>
        </div>
      )
    },
  },
  {
    id: 'accented-speakers',
    Content: () => (
      <div className='pt-0' id='accented-speakers'>
        <div className='mb-3'>
          <h3 className='text-black text-xl'>Accented Speakers</h3>
        </div>
        <p className='text-slate-500'>
          Our base rates apply to files with American-accented speakers. For
          files with speakers of other accents, additional charges will be
          incurred. We have expertise in a wide range of accents, including
          British, Australian, Indian, African, as well as various European and
          Asian accents.
        </p>
        <br />
        <p className='text-slate-500'>
          We guarantee 99%+ accuracy for files with accented speakers. Please
          note that accented files may require more time and may be subject to{' '}
          <a
            href='/customer-guide#additional-charges'
            className='text-blue-500 underline'
          >
            additional charges
          </a>
          .
        </p>
      </div>
    ),
  },
  {
    id: 'noisy-files',
    Content: () => (
      <div className='pt-0' id='noisy-files'>
        <div className='mb-3'>
          <h3 className='text-black text-xl'>Noisy Files</h3>
        </div>
        <p className='text-slate-500'>
          We can transcribe files that are recorded in noisy backgrounds, such
          as cafes or crowds, as long as the main speakers are clear and
          audible. Even files with ambient background noise, like air
          conditioning hiss, can be transcribed as long as the main speakers can
          still be heard clearly.
        </p>
        <br />
        <p className='text-slate-500'>
          Please note that noisy files may require additional time to process
          and may also incur{' '}
          <a
            href='/customer-guide#additional-charges'
            className='text-blue-500 underline'
          >
            additional charges
          </a>
          . In cases where the files are deemed untranscribable, a full refund
          will be issued.
        </p>
      </div>
    ),
  },
  {
    id: 'recording-tips',
    Content: () => (
      <div className='pt-0' id='recording-tips'>
        <div className='mb-3'>
          <h3 className='text-black text-xl'>Recording Tips</h3>
        </div>
        <p className='text-slate-500'>
          The audio quality of the recording is the most crucial factor that
          impacts transcript accuracy. Good audio files require less time and
          effort to transcribe, which is why our system prioritizes them. In
          comparison, poor audio files require approximately 3 to 4 times more
          effort. To save on transcription costs and ensure highly accurate
          transcripts, we recommend following these simple steps:
        </p>
        <br />
      </div>
    ),
  },
  {
    id: 'best-practices',
    Content: () => (
      <div className='pt-0' id='best-practices'>
        <div className='mb-3'>
          <h3 className='text-black text-xl'>Best Practices</h3>
        </div>
        <p className='text-slate-500'>
          The following recommendations apply to all types of recordings.
        </p>
        <br />
        <ul className='list-disc pl-5 text-slate-500'>
          <li>
            Smartphones are the best recording devices available today, and we
            recommend using them instead of digital/tape recorders. Smartphones
            have good microphones and provide built-in apps for recording.
          </li>
          <li>
            The first 30 seconds of the recording should always contain silence.
            This allows it to be used as a noise profile while cleaning the
            file. We recommend using{' '}
            <a
              className='text-blue-500 underline'
              href='http://www.audacityteam.org/'
            >
              Audacity
            </a>{' '}
            for cleaning.
          </li>
          <li>
            For optimal quality, we recommend using a minimum of 128 kbit/s
            encoding{' '}
            <a
              className='text-blue-500 underline'
              href='https://en.wikipedia.org/wiki/Bit_rate#Encoding_bit_rate'
            >
              sampling rate
            </a>{' '}
            with a 16-bit depth.
          </li>
          <li>
            Recordings should be made in an environment with minimal ambient
            noise. If ambient noise is unavoidable, we recommend recording 30
            seconds of silence at the beginning and using it to clean the
            recording afterward.
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: 'inperson-recordings',
    Content: () => (
      <div className='pt-0' id='inperson-recordings'>
        <div className='mb-3'>
          <h3 className='text-black text-xl'>In-person Recordings</h3>
        </div>
        <p className='text-slate-500'>
          In-person recordings are recordings made with two or more participants
          in the same room or place. The following are our recommendations:
        </p>
        <br />
        <ul className='list-disc pl-5 text-slate-500'>
          <li>
            The recorder should be kept equidistant from the participants. For
            group discussions or focus groups, the optimal arrangement for
            participants is a circle with the recording device kept at the
            center.
          </li>
          <li>
            The recording device should be kept on a book or some other soft
            material that can absorb keyboard sounds or any other disturbances.
            Disturbances sometimes can obscure the speaker&apos;s diction and
            should be kept avoided as much as possible.
          </li>
          <li>
            We suggest recording with at least two devices to have an alternate
            version available if needed.
          </li>
          <li>
            For lectures/event recordings where only the main voice is required,
            edit the audio file afterward and remove other voices. This will
            reduce the cost of the transcript as well.
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: 'call-recordings',
    Content: () => (
      <div className='pt-0' id='custom-format'>
        <div className='mb-3'>
          <h3 className='text-black text-xl'>Phone/Online Call Recordings</h3>
        </div>
        <p className='text-slate-500'>
          Phone recordings are interviews/conversations over the phone which are
          recorded off-the-speaker. We recommend using a conferencing service to
          record phone calls and fall back on recording off-the-speaker. These
          recommendations also apply to internet phone calls such as Skype,
          Google Hangouts, WebEx calls, etc.
        </p>
        <br />
        <ul className='list-disc pl-5 text-slate-500'>
          <li>
            The recording device should be directed toward the speaker of the
            phone/computer.
          </li>
          <li>
            Use high-quality speakers, if possible external speakers connected
            to the phone/computer. Smartphones do not usually have good speakers
            and should be avoided. We recommend using them only as the recording
            device as they have good microphones.
          </li>
          <li>
            If there is a detectable line noise (buzzing sound on the phone
            line), try disconnecting and calling again. Line noise is very hard
            to remove and disorienting for the transcribers.
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: 'recommended-readings',
    Content: () => (
      <div className='pt-0' id='recommended-readings'>
        <div className='mb-3'>
          <h3 className='text-black text-xl'>Recommended Readings</h3>
        </div>
        <br />
        <p className='text-slate-500'>
          We write extensively on our blog about how to record good-quality
          files for transcription. The following are some relevant links:
        </p>
        <br />
        <ul className='list-disc pl-5 text-slate-500'>
          <li>
            <a
              className='text-blue-500 underline'
              href='https://scribie.com/blog/2016/01/how-to-clean-the-audio-file/'
            >
              How To Clean The Audio File
            </a>
          </li>
          <li>
            <a
              className='text-blue-500 underline'
              href='https://scribie.com/blog/2016/02/how-to-record-good-quality-audio-to-ensure-accurate-transcripts/'
            >
              Recording Tips
            </a>
          </li>
          <li>
            <a
              className='text-blue-500 underline'
              href='https://scribie.com/blog/2016/03/how-can-a-good-quality-audio-file-reduce-your-cost-transcription/'
            >
              More Recording Tips
            </a>
          </li>
          <li>
            <a
              className='text-blue-500 underline'
              href='https://scribie.com/blog/2016/03/how-does-scribie-ensure-best-quality-transcription-at-a-lower-cost/'
            >
              Save Transcription Cost With Good Quality Audio
            </a>
          </li>
        </ul>
        <br />
        <p className='text-slate-500'>
          There are other tutorials/videos available online, and we recommend
          that you research a good recording setup independently as well.
        </p>
      </div>
    ),
  },
  {
    id: 'order-options',
    Content: () => {
      const issues = [
        {
          issue: 'Speaker Tracking (enabled by default)',
          examples: 'Strict Verbatim (+$0.50/minute)',
        },
        {
          issue: 'Audio Time-coding (enabled by default)',
          examples: 'Rush Orders (+$1.25/minute)',
        },
        {
          issue: 'Subtitle File (machine-generated)',
          examples: 'Closed Captions (+0.59/minute)',
        },
        {
          issue: 'Transcript Template',
          examples: 'Custom Transcript Template',
        },
        { issue: 'Spelling Style', examples: '' },
      ]
      return (
        <div className='pt-0' id='custom-format'>
          <div className='mb-3'>
            <h3 className='text-black text-xl'>Order Options</h3>
          </div>
          <br />
          <p className='text-slate-500'>
            You can specify certain options when placing your order with us. The
            following table presents the available order options for our
            transcription and formatting services, indicating which ones are
            free and which ones involve additional costs.
          </p>
          <br />
          <table className='min-w-full bg-white shadow-md rounded-lg overflow-hidden'>
            <thead className='bg-gray-200 text-gray-600 uppercase text-sm leading-normal'>
              <tr>
                <th className='py-3 px-6 text-left'>Free Options</th>
                <th className='py-3 px-6 text-left'>
                  Options with Additional Cost
                </th>
              </tr>
            </thead>
            <tbody className='text-gray-600 text-sm font-light'>
              {issues.map((item, index) => (
                <tr
                  key={index}
                  className='border-b border-gray-200 hover:bg-gray-100'
                >
                  <td className='py-3 px-6 text-left whitespace-nowrap'>
                    {item.issue}
                  </td>
                  <td className='py-3 px-6 text-left'>{item.examples}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    },
  },
  {
    id: 'strict-verbatim',
    Content: () => (
      <div className='pt-0' id='strict_verbatim'>
        <div className='mb-3'>
          <h3 className='text-black text-xl'>Strict Verbatim</h3>
        </div>
        <br />
        <p className='text-slate-500'>
          We will include all utterances, e.g. &apos;mm-hmm&apos;,
          &apos;uh-huh&apos;, &apos;umm&apos;, and &apos;uh&apos;, fillers, and
          false starts in the transcript. By default, transcripts are non-strict
          verbatim and do not include these unless necessary. An additional
          charge of $0.50/minute of audio is applicable for strict verbatim
          transcripts.
        </p>
      </div>
    ),
  },
  {
    id: 'rush-orders',
    Content: () => (
      <div className='pt-0' id='rush-orders'>
        <div className='mb-3'>
          <h3 className='text-black text-xl'>Rush Orders</h3>
        </div>
        <br />
        <p className='text-slate-500'>
          By opting for a rush order, we will prioritize the processing of your
          file, significantly expediting its completion. The turnaround time for
          rush orders is typically three to five times faster than our standard
          processing time.
        </p>
        <br />
      </div>
    ),
  },
  {
    id: 'subtitle-file',
    Content: () => (
      <div className='pt-0' id='subtitle-file'>
        <div className='mb-3'>
          <h3 className='text-black text-xl'>Subtitle File</h3>
        </div>
        <br />
        <p className='text-slate-500'>
          We also provide subtitle files in{' '}
          <a
            href='http://en.wikipedia.org/wiki/SubRip#SubRip_text_file_format'
            className='text-blue-500 underline'
          >
            SubRip (.srt)
          </a>{' '}
          and{' '}
          <a
            className='text-blue-500 underline'
            href='http://en.wikipedia.org/wiki/SubViewer'
          >
            WebVTT (.vtt)
          </a>
          formats. Only basic versions are supported, without any style markup.
          These subtitle files are machine-generated based on the transcribed
          content. The timecode accuracy is +/- 1 second. Please{' '}
          <a
            href='/contact'
            className='text-blue-500 underline'
            target='_blank'
          >
            contact
          </a>{' '}
          us if you require subtitle files in other formats. No additional
          charges apply for this option
        </p>
        <br />
      </div>
    ),
  },
  {
    id: 'audio-timecoding',
    Content: () => (
      <div className='pt-0' id='audio-timecoding'>
        <div className='mb-3'>
          <h3 className='text-black text-xl'>Audio Timecoding</h3>
        </div>
        <br />
        <p className='text-slate-500'>
          We provide audio timecoding by default. Timecoding refers to the
          process of adding the running time of the audio before each paragraph.
          New paragraphs are started at every change of speaker or 3 minutes,
          whichever is earlier.
        </p>
        <br />
        <p className='text-slate-500'>
          Each paragraph begins with the audio time which indicates the running
          time of the audio file at which the particular speaker started
          speaking for that paragraph. We provide an accuracy of +/- 1 second
          for the time stamp. For higher accuracy, please{' '}
          <a
            href='/contact'
            className='text-blue-500 underline'
            target='_blank'
          >
            contact us
          </a>
          .
        </p>
        <br />
      </div>
    ),
  },
  {
    id: 'speaker-tracking',
    Content: () => (
      <div className='pt-0' id='speaker-tracking'>
        <div className='mb-3'>
          <h3 className='text-black text-xl'>Speaker Tracking</h3>
        </div>
        <br />
        <p className='text-slate-500'>
          We provide speaker tracking by default. Speaker tracking refers to the
          process of adding the speaker tags before each paragraph. New
          paragraphs are started at every change of speaker or every 3 minutes,
          whichever is earlier. Before each paragraph, we add the speaker name,
          if available, or their order of appearance in the audio, e.g. Speaker
          1, Speaker 2, etc. We also provide an option to specify the speaker
          names before the order is placed. The speaker names can also be
          changed after the file has been delivered using our{' '}
          <a className='text-blue-500 underline' href='/customer-guide#editor'>
            Integrated Editor.
          </a>
        </p>
        <br />
        <p className='text-slate-500'>
          We do not have a maximum number of speakers to be tracked. However, it
          may be difficult to identify the speakers if there are four or more
          speakers in any file. We mark such speakers as S? in the transcript.
          This issue can be avoided if the speakers speak aloud their names at
          each turn. Otherwise, the speaker tracking is best-effort and we
          cannot guarantee the correctness.
        </p>
        <br />
        <p className='text-slate-500'>
          There is no extra charge for speaker tracking.
        </p>
      </div>
    ),
  },
  {
    id: 'spelling-style',
    Content: () => (
      <div className='pt-0' id='spelling-style'>
        <div className='mb-3'>
          <h3 className='text-black text-xl'>Spelling Style</h3>
        </div>
        <br />
        <p className='text-slate-500'>
          We support the following spelling styles.
        </p>
        <br />
        <ul className='list-disc pl-5 text-slate-500'>
          <li>American</li>
          <li>British</li>
          <li>Australian</li>
          <li>Canadian</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'transcript-template',
    Content: () => {
      const issues = [
        {
          issue: 'Scribie Single Line Spaced',
          examples:
            'Contains a title page, Scribie Logo, header, footer, and the transcript is single-line spaced',
        },
        {
          issue: 'Scribie Double Line Spaced',
          examples: 'Same as above, except the transcript is double-spaced',
        },
        {
          issue: 'Blank Single Line Spaced',
          examples: 'Contains only the transcript which is single-line spaced',
        },
        {
          issue: 'Blank Double Line Spaced',
          examples: 'Same as above, except the transcript is double-spaced',
        },
      ]
      return (
        <div className='pt-0' id='transcript-template'>
          <div className='mb-3'>
            <h3 className='text-black text-xl'>Transcript Template</h3>
          </div>
          <br />
          <p className='text-slate-500'>
            This option allows you to specify the template file used for
            document conversion. The following transcript templates are
            available.
          </p>
          <br />
          <p className='text-slate-500'>
            The{' '}
            <a
              href='/customer-guide#sample-transcript'
              className='text-blue-500 underline'
            >
              sample transcript
            </a>{' '}
            has been formatted with Scribie Single Line Spaced template. We also
            support custom template files. Please{' '}
            <a href='/contact' className='text-blue-500 underline'>
              contact us
            </a>{' '}
            with your template file to have it set up.
          </p>
          <br />
          <table className='min-w-full bg-white shadow-md rounded-lg overflow-hidden'>
            <thead className='bg-gray-200 text-gray-600 uppercase text-sm leading-normal'>
              <tr>
                <th className='py-3 px-6 text-left'>Free Options</th>
                <th className='py-3 px-6 text-left'>
                  Options with Additional Cost
                </th>
              </tr>
            </thead>
            <tbody className='text-gray-600 text-sm font-light'>
              {issues.map((item, index) => (
                <tr
                  key={index}
                  className='border-b border-gray-200 hover:bg-gray-100'
                >
                  <td className='py-3 px-6 text-left whitespace-nowrap'>
                    {item.issue}
                  </td>
                  <td className='py-3 px-6 text-left'>{item.examples}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    },
  },
  {
    id: 'closed-captions',
    Content: () => (
      <div className='pt-0' id='closed-captions'>
        <div className='mb-3'>
          <h3 className='text-black text-xl'>Closed Captions</h3>
        </div>
        <br />
        <p className='text-slate-500'>
          We provide closed captions by having our captioners edit the
          machine-generated subtitle files or proofread transcripts to ensure
          compliance with basic captioning regulations. Our captioners ensure
          that the captions adhere to ADA (Americans with Disabilities Act)
          regulations.
        </p>
        <br />
        <p className='text-slate-500'>
          Standard/basic closed captions incur an additional charge of $0.59 per
          minute.
        </p>
        <br />
        <p className='text-slate-500'>
          If you require non-standard options such as specific caption placement
          or FCC (Federal Communications Commission) compliance,{' '}
          <a className='text-blue-500 underline' href='/contact'>
            please reach out to us
          </a>{' '}
          with a list of your requirements. The additional cost will vary
          depending on the complexity of your requirements.
        </p>
        <br />
      </div>
    ),
  },
  {
    id: 'unique-selling-points',
    Content: () => (
      <div className='pt-0' id='unique-selling-points'>
        <div className='mb-3'>
          <h3 className='text-black text-xl'>Unique Selling Points</h3>
        </div>
        <br />
        <p className='text-slate-500'>
          Our transcription service offers features that save you time and
          money. Transcription is very labor-intensive work and we ensure that
          you get the best possible transcript.
        </p>
        <br />
        <ul className='list-disc pl-5 text-slate-500'>
          <li>
            Our transcription process combines the latest AI technology with our
            industry-leading human-in-the-loop expertise, ensuring that the
            files consistently achieve a minimum accuracy of 99%.
          </li>
          <li>
            You pay a fixed price for the transcript based on the audio length
            and not the time spent transcribing.
          </li>
          <li>
            We provide the best price-to-accuracy ratio for clean files with
            American speakers.
          </li>
          <li>
            We are committed to quality. The{' '}
            <a
              className='text-blue-500 underline'
              href='/customer-guide#additional-charges'
            >
              additional charges
            </a>{' '}
            ensure that the transcript is as accurate as possible, regardless of
            the difficulty level.
          </li>
          <li>
            We carefully vet each one of our transcribers and continuously
            monitor their performance.
          </li>
          <li>
            We research uncommon terms, acronyms, etc., and ensure that the
            transcripts are contextually correct.
          </li>
          <li>
            We deliver files on time. If we anticipate a delay then we will
            inform you well in advance.
          </li>
          <li>
            You can monitor the progress and check the Draft Transcript from
            your account at any stage.
          </li>
          <li>
            You can order a free re-review if you are not satisfied with the
            transcript.
          </li>
          <li>
            We are consistent, predictable, and accurate. You can plan around
            us.
          </li>
          <li>
            As a company, we take confidentiality very seriously and we handle
            your files with utmost care.
          </li>
          <li>
            We respond to your questions in a timely manner and continue
            supporting you even after the file is delivered.
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: 'sample-transcript',
    Content: () => (
      <div className='pt-0' id='sample-transcript'>
        <div className='mb-3'>
          <h3 className='text-black text-xl'>Sample Transcript</h3>
        </div>
        <br />
        <p className='text-slate-500'>
          The following is a sample audio and the corresponding transcript. More
          sample transcripts are available on{' '}
          <a
            className='text-blue-500 underline'
            href='https://scribie.com/blog/category/sample-transcripts/'
          >
            our blog.
          </a>
        </p>
        <br />
      </div>
    ),
  },
  {
    id: 'support',
    Content: () => (
      <div className='pt-0' id='support'>
        <div className='mb-3'>
          <h3 className='text-black text-xl'>Support</h3>
        </div>
        <br />
        <p className='text-slate-500'>
          We provide phone, live chat, and email support on weekdays and email
          support on weekends. Our customer support team is well-trained and
          responsive. We ensure that all questions and issues are addressed
          promptly. Please do not hesitate to{' '}
          <a className='text-blue-500 underline' href='/contact'>
            reach out to us.
          </a>
        </p>
        <br />
        <br />
        <br />
      </div>
    ),
  },
]

export default function Page() {
  const pathname = usePathname()
  const rightSidebarRef = useRef<HTMLElement | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  const scrollToSection = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault()
    const targetId = event.currentTarget.getAttribute('href')?.split('#')[1]
    if (!targetId) return

    const targetElement = document.getElementById(targetId)
    if (targetElement) {
      const headerOffset = 140
      const elementPosition = targetElement.getBoundingClientRect().top
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      })

      // Close the sheet when a link is clicked
      setIsSheetOpen(false)
    }
  }

  const SidebarContent = () => (
    <>
      {sidebarItems.map((item) => {
        const isActive = pathname === item.link
        return (
          <a
            key={item.link}
            href={item.link}
            onClick={scrollToSection}
            className={`flex items-center gap-2.5 rounded-lg py-2 transition-all ${
              isActive ? 'text-primary bg-primary/10' : 'hover:text-primary'
            }`}
          >
            {item.name}
          </a>
        )
      })}
    </>
  )

  return (
    <>
      <div className='w-full min-h-screen'>
        <div className='flex flex-col lg:flex-row'>
          {/* Mobile Hamburger Menu */}
          <div className='lg:hidden w-full sticky top-[64px] z-40 bg-background border-b'>
            <div className='px-4 md:px-8 py-4'>
              <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetTrigger asChild>
                  <button className='p-2 hover:bg-accent rounded-md'>
                    <Menu className='h-6 w-6' />
                  </button>
                </SheetTrigger>
                <SheetContent side='left' className='w-[80%] max-w-sm'>
                  <nav className='flex flex-col space-y-1 mt-8 px-4'>
                    <SidebarContent />
                  </nav>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          {/* Rest of the code remains the same */}
          <nav className='hidden lg:flex lg:flex-col space-y-1 w-[300px] h-[calc(100vh-64px)] sticky top-[64px] pt-8 pl-[10%] overflow-y-auto'>
            <SidebarContent />
          </nav>

          <main
            ref={rightSidebarRef as LegacyRef<HTMLDivElement>}
            className='flex-1 pb-16 overflow-y-auto pl-16 pr-[10%]'
          >
            {content.map((item) => {
              const Content = item.Content
              return (
                <div key={item.id} id={item.id}>
                  <Content />
                </div>
              )
            })}
          </main>
        </div>
      </div>
    </>
  )
}
