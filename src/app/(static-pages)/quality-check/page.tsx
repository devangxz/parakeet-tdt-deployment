// `app/page.tsx` is the UI for the `/` URL
'use client'
import { LegacyRef, useRef } from 'react'

const sidebarItems = [
  { link: '#intro', name: 'Introduction' },
  { link: '#payment-rate', name: 'Payment Rate' },
  { link: '#daily-bonus', name: 'Daily Bonus' },
  { link: '#independent-contractors', name: 'Independent Contractors' },
  { link: '#word-error-rate', name: 'Word Error Rate' },
  { link: '#difficulty-levels', name: 'Difficulty Levels' },
  { link: '#accents', name: 'Accents' },
  { link: '#performance', name: 'Performance' },
  { link: '#process', name: 'QC Process' },
  { link: '#speaker-names', name: 'Speaker Names' },
  { link: '#speaker-tracking', name: 'Speaker Tracking' },
  { link: '#t&c', name: 'Terms and Phrase analysis' },
  { link: '#useful-shortcuts', name: 'Useful Shortcuts' },
  { link: '#player-history', name: 'Player History' },
  { link: '#timeouts', name: 'Timeouts' },
  { link: '#get-started', name: 'Get Started' },
]

const content = [
  {
    id: 'intro',
    Content: () => (
      <div id='intro'>
        <br />
        <div className='border-b pb-5 mb-5'>
          <h1 className='text-black font-semibold text-4xl'>
            <span className='font-semibold'>Quality Check Guide</span>
          </h1>
          <br />
          <p className='text-slate-500'>
            Quality Check (QC) is the fourth and the final step our
            transcription process. As a proofreader on Scribie.com, you have
            been working on files which are transcribed and reviewed and also
            longer. QC comes after proofreading where we combine all the
            proofreading parts into a single file. The goal is to estimate the
            accuracy of the transcript, normalize the speaker tracking and
            deliver the file, provided the accuracy is 99%+. Otherwise, the file
            should be rejected and proofread again. This document provides all
            the details required to start QC. Please{' '}
            <a
              href='/contact'
              target='_blank'
              className='text-blue-500 underline'
            >
              contact support
            </a>{' '}
            for any questions or clarifications.
          </p>{' '}
          <br />
        </div>
      </div>
    ),
  },
  {
    id: 'payment-rate',
    Content: () => (
      <div className='pt-0' id='payment-rate'>
        <div className='mb-3'>
          <h3 className='text-black text-xl'>Payment Rates</h3>
        </div>
        <br />
        <p className='text-slate-500'>
          The payment rate for QC varies from $5/ah to $20/ah (ah stands for
          audio hour), unless you&apos;re a contractor in which case the payment
          rate is fixed. The rates are higher for later steps in our process as
          there are fewer people there. Therefore QCs are paid the highest
          rates.
        </p>
        <br />
        <p className='text-slate-500'>
          The rates are determined by an algorithm which takes into account
          various factors such as deadline, difficulty level, system load, your
          average grades, etc. If you see only lower rated files, that&apos;s
          because all the higher rated files have already been selected.
        </p>
        <br />
        <p className='text-slate-500'>
          The payment is credited once your submission is approved. Rejected
          files are not paid.
        </p>
        <br />
      </div>
    ),
  },
  {
    id: 'daily-bonus',
    Content: () => (
      <div className='pt-0' id='daily-bonus'>
        <div className='mb-3'>
          <h3 className='text-black text-xl'>Daily Bonus</h3>
        </div>
        <br />
        <p className='text-slate-500'>
          We also pay a daily bonus of $10 each day for 4 or more hours of QC
          files delivered. All files submitted during the day, both the QC
          failed and un-approved files are counted. If the total duration of the
          files submitted is 4 hours or more, a $10 bonus is credited to your
          account. The day starts at 2:30 PM EDT (US) for each calendar date.
          The bonus credit is also made at 2:30 PM EDT (US).
        </p>
        <br />
        <p className='text-slate-500'>
          The daily bonus amount is fixed and does not increase with the hours
          submitted. Also, there is an 8 hour limit on QC files that can be
          submitted each day.
        </p>
        <br />
      </div>
    ),
  },
  {
    id: 'independent-contractors',
    Content: () => (
      <div className='pt-0' id='independent-contractors'>
        <div className='mb-3'>
          <h3 className='text-black text-xl'>Independent Contractors</h3>
        </div>
        <br />
        <p className='text-slate-500'>
          We also offer Independent Contractor position for QCs. We pay rate is
          fixed rate for each file and files will be assigned to you. However,
          you will be protected from grade fluctuations and your account will
          not be disabled if your average grade falls below the minimum
          required. We only hire experienced freelancers as contractors. Please
          contact support if you&apos;re interested.
        </p>
        <br />
      </div>
    ),
  },
  {
    id: 'word-error-rate',
    Content: () => (
      <div className='pt-0' id='word-error-rate'>
        <div className='mb-3'>
          <h3 className='text-black text-xl'>Word Error Rate</h3>
        </div>
        <br />
        <p className='text-slate-500'>
          The Word Error Rate (WER) is a measure of how much the transcript has
          changed w.r.t to the automated transcript. It is calculated as the
          percentage of number of changed/added words by the total words in the
          automated transcript. Deleted words are not counted. The low
          difficulty files will have the lowest WERs, followed by medium and
          high difficult files. Usually we return files in which more than 50%
          of the automated transcript has to be changed, with the exception of
          short files.
        </p>
        <br />
      </div>
    ),
  },
  {
    id: 'difficulty-levels',
    Content: () => (
      <div className='pt-0' id='difficulty-levels'>
        <div className='mb-3'>
          <h3 className='text-black text-xl'>Difficulty Levels</h3>
        </div>
        <br />
        <p className='text-slate-500'>
          We provide guidance for difficulty level with each file. The
          difficulty levels are: Low, Medium and High. These levels indicate the
          amount of changes required with respect to the automated transcript to
          achieve 100% accuracy. Please refer to the following table for the
          percentage of words which have to be corrected.
        </p>
        <br />
        <table className='min-w-full bg-white shadow-md rounded-lg overflow-hidden'>
          <thead className='bg-gray-200 text-gray-600 uppercase text-sm leading-normal'>
            <tr>
              <th className='py-3 px-6 text-left'>Difficulty Level</th>
              <th className='py-3 px-6 text-left'>Corrections Percentage</th>
            </tr>
          </thead>
          <tbody className='text-gray-600 text-sm font-light'>
            <tr className='border-b border-gray-200 hover:bg-gray-100'>
              <td className='py-3 px-6 text-left'>
                <span className='label label-success'>Low</span>
              </td>
              <td className='py-3 px-6 text-left'>
                Less than 10% of all words
              </td>
            </tr>
            <tr className='border-b border-gray-200 hover:bg-gray-100'>
              <td className='py-3 px-6 text-left'>
                <span className='label label-success'>Medium</span>
              </td>
              <td className='py-3 px-6 text-left'>
                Around 10-20% of all words
              </td>
            </tr>
            <tr className='border-b border-gray-200 hover:bg-gray-100'>
              <td className='py-3 px-6 text-left'>
                <span className='label label-success'>High</span>
              </td>
              <td className='py-3 px-6 text-left'>
                More than 20% of all words
              </td>
            </tr>
          </tbody>
        </table>
        <br />
        <p className='text-slate-500'>
          We have extensively tested this algorithm and these ranges are
          accurate to +/- 5%. This algorithm is based on a Linear Regression
          model which predicts how many words in the automated transcript are
          likely to be wrong based on all the files which we delivered in the
          last 3 months.
        </p>
        <br />
        <br />
      </div>
    ),
  },
  {
    id: 'accents',
    Content: () => (
      <div className='pt-0' id='accents'>
        <div className='mb-3'>
          <h3 className='text-black text-xl'>Accents</h3>
        </div>
        <br />
        <p className='text-slate-500'>
          We provide guidance for difficulty level with each file. The
          difficulty levels are: Low, Medium and High. These levels indicate the
          amount of changes required with respect to the automated transcript to
          achieve 100% accuracy. Please refer to the following table for the
          percentage of words which have to be corrected.
        </p>
        <br />
        <table className='min-w-full bg-white shadow-md rounded-lg overflow-hidden'>
          <thead className='bg-gray-200 text-gray-600 uppercase text-sm leading-normal'>
            <tr>
              <th className='py-3 px-6 text-left'>Accent Code</th>
              <th className='py-3 px-6 text-left'>Description</th>
            </tr>
          </thead>
          <tbody className='text-gray-600 text-sm font-light'>
            <tr className='border-b border-gray-200 hover:bg-gray-100'>
              <td className='py-3 px-6 text-left'>
                <span className='label label-info'>NA</span>
              </td>
              <td className='py-3 px-6 text-left'>North American</td>
            </tr>
            <tr className='border-b border-gray-200 hover:bg-gray-100'>
              <td className='py-3 px-6 text-left'>
                <span className='label label-info'>CA</span>
              </td>
              <td className='py-3 px-6 text-left'>Canadian</td>
            </tr>
            <tr className='border-b border-gray-200 hover:bg-gray-100'>
              <td className='py-3 px-6 text-left'>
                <span className='label label-info'>AU</span>
              </td>
              <td className='py-3 px-6 text-left'>Australian</td>
            </tr>
            <tr className='border-b border-gray-200 hover:bg-gray-100'>
              <td className='py-3 px-6 text-left'>
                <span className='label label-info'>GB</span>
              </td>
              <td className='py-3 px-6 text-left'>British</td>
            </tr>
            <tr className='border-b border-gray-200 hover:bg-gray-100'>
              <td className='py-3 px-6 text-left'>
                <span className='label label-info'>IN</span>
              </td>
              <td className='py-3 px-6 text-left'>Indian</td>
            </tr>
            <tr className='border-b border-gray-200 hover:bg-gray-100'>
              <td className='py-3 px-6 text-left'>
                <span className='label label-info'>AA</span>
              </td>
              <td className='py-3 px-6 text-left'>African-American</td>
            </tr>
            <tr className='border-b border-gray-200 hover:bg-gray-100'>
              <td className='py-3 px-6 text-left'>
                <span className='label label-info'>AF</span>
              </td>
              <td className='py-3 px-6 text-left'>African</td>
            </tr>
            <tr className='border-b border-gray-200 hover:bg-gray-100'>
              <td className='py-3 px-6 text-left'>
                <span className='label label-info'>RW</span>
              </td>
              <td className='py-3 px-6 text-left'>Rwandan</td>
            </tr>
            <tr className='border-b border-gray-200 hover:bg-gray-100'>
              <td className='py-3 px-6 text-left'>
                <span className='label label-info'>GR</span>
              </td>
              <td className='py-3 px-6 text-left'>German</td>
            </tr>
            <tr className='border-b border-gray-200 hover:bg-gray-100'>
              <td className='py-3 px-6 text-left'>
                <span className='label label-info'>FR</span>
              </td>
              <td className='py-3 px-6 text-left'>French</td>
            </tr>
            <tr className='border-b border-gray-200 hover:bg-gray-100'>
              <td className='py-3 px-6 text-left'>
                <span className='label label-info'>IT</span>
              </td>
              <td className='py-3 px-6 text-left'>Italian</td>
            </tr>
            <tr className='border-b border-gray-200 hover:bg-gray-100'>
              <td className='py-3 px-6 text-left'>
                <span className='label label-info'>PL</span>
              </td>
              <td className='py-3 px-6 text-left'>Polish</td>
            </tr>
            <tr className='border-b border-gray-200 hover:bg-gray-100'>
              <td className='py-3 px-6 text-left'>
                <span className='label label-info'>EU</span>
              </td>
              <td className='py-3 px-6 text-left'>European</td>
            </tr>
            <tr className='border-b border-gray-200 hover:bg-gray-100'>
              <td className='py-3 px-6 text-left'>
                <span className='label label-info'>SP</span>
              </td>
              <td className='py-3 px-6 text-left'>Spanish</td>
            </tr>
            <tr className='border-b border-gray-200 hover:bg-gray-100'>
              <td className='py-3 px-6 text-left'>
                <span className='label label-info'>RU</span>
              </td>
              <td className='py-3 px-6 text-left'>Russian</td>
            </tr>
            <tr className='border-b border-gray-200 hover:bg-gray-100'>
              <td className='py-3 px-6 text-left'>
                <span className='label label-info'>FN</span>
              </td>
              <td className='py-3 px-6 text-left'>Finnish</td>
            </tr>
            <tr className='border-b border-gray-200 hover:bg-gray-100'>
              <td className='py-3 px-6 text-left'>
                <span className='label label-info'>TK</span>
              </td>
              <td className='py-3 px-6 text-left'>Turkish</td>
            </tr>
            <tr className='border-b border-gray-200 hover:bg-gray-100'>
              <td className='py-3 px-6 text-left'>
                <span className='label label-info'>ID</span>
              </td>
              <td className='py-3 px-6 text-left'>Indonesian</td>
            </tr>
            <tr className='border-b border-gray-200 hover:bg-gray-100'>
              <td className='py-3 px-6 text-left'>
                <span className='label label-info'>MX</span>
              </td>
              <td className='py-3 px-6 text-left'>Mexican</td>
            </tr>
            <tr className='border-b border-gray-200 hover:bg-gray-100'>
              <td className='py-3 px-6 text-left'>
                <span className='label label-info'>HP</span>
              </td>
              <td className='py-3 px-6 text-left'>Hispanic</td>
            </tr>
            <tr className='border-b border-gray-200 hover:bg-gray-100'>
              <td className='py-3 px-6 text-left'>
                <span className='label label-info'>LA</span>
              </td>
              <td className='py-3 px-6 text-left'>Latin American</td>
            </tr>
            <tr className='border-b border-gray-200 hover:bg-gray-100'>
              <td className='py-3 px-6 text-left'>
                <span className='label label-info'>BR</span>
              </td>
              <td className='py-3 px-6 text-left'>Brazilian</td>
            </tr>
            <tr className='border-b border-gray-200 hover:bg-gray-100'>
              <td className='py-3 px-6 text-left'>
                <span className='label label-info'>PR</span>
              </td>
              <td className='py-3 px-6 text-left'>Portuguese</td>
            </tr>
            <tr className='border-b border-gray-200 hover:bg-gray-100'>
              <td className='py-3 px-6 text-left'>
                <span className='label label-info'>NL</span>
              </td>
              <td className='py-3 px-6 text-left'>Dutch</td>
            </tr>
            <tr className='border-b border-gray-200 hover:bg-gray-100'>
              <td className='py-3 px-6 text-left'>
                <span className='label label-info'>ME</span>
              </td>
              <td className='py-3 px-6 text-left'>Middle Eastern</td>
            </tr>
            <tr className='border-b border-gray-200 hover:bg-gray-100'>
              <td className='py-3 px-6 text-left'>
                <span className='label label-info'>IR</span>
              </td>
              <td className='py-3 px-6 text-left'>Irish</td>
            </tr>
            <tr className='border-b border-gray-200 hover:bg-gray-100'>
              <td className='py-3 px-6 text-left'>
                <span className='label label-info'>AS</span>
              </td>
              <td className='py-3 px-6 text-left'>Asian</td>
            </tr>
            <tr className='border-b border-gray-200 hover:bg-gray-100'>
              <td className='py-3 px-6 text-left'>
                <span className='label label-info'>CN</span>
              </td>
              <td className='py-3 px-6 text-left'>Chinese</td>
            </tr>
            <tr className='border-b border-gray-200 hover:bg-gray-100'>
              <td className='py-3 px-6 text-left'>
                <span className='label label-info'>KO</span>
              </td>
              <td className='py-3 px-6 text-left'>Korean</td>
            </tr>
            <tr className='border-b border-gray-200 hover:bg-gray-100'>
              <td className='py-3 px-6 text-left'>
                <span className='label label-info'>SG</span>
              </td>
              <td className='py-3 px-6 text-left'>Singaporean</td>
            </tr>
            <tr className='border-b border-gray-200 hover:bg-gray-100'>
              <td className='py-3 px-6 text-left'>
                <span className='label label-info'>EA</span>
              </td>
              <td className='py-3 px-6 text-left'>East Asian</td>
            </tr>
            <tr className='border-b border-gray-200 hover:bg-gray-100'>
              <td className='py-3 px-6 text-left'>
                <span className='label label-info'>NZ</span>
              </td>
              <td className='py-3 px-6 text-left'>New Zealand</td>
            </tr>
            <tr className='border-b border-gray-200 hover:bg-gray-100'>
              <td className='py-3 px-6 text-left'>
                <span className='label label-info'>AB</span>
              </td>
              <td className='py-3 px-6 text-left'>Arabic</td>
            </tr>
            <tr className='border-b border-gray-200 hover:bg-gray-100'>
              <td className='py-3 px-6 text-left'>
                <span className='label label-info'>MY</span>
              </td>
              <td className='py-3 px-6 text-left'>Malaysian</td>
            </tr>
            <tr className='border-b border-gray-200 hover:bg-gray-100'>
              <td className='py-3 px-6 text-left'>
                <span className='label label-info'>JP</span>
              </td>
              <td className='py-3 px-6 text-left'>Japanese</td>
            </tr>
            <tr className='border-b border-gray-200 hover:bg-gray-100'>
              <td className='py-3 px-6 text-left'>
                <span className='label label-info'>SE</span>
              </td>
              <td className='py-3 px-6 text-left'>Southeast Asian</td>
            </tr>
            <tr className='border-b border-gray-200 hover:bg-gray-100'>
              <td className='py-3 px-6 text-left'>
                <span className='label label-info'>SA</span>
              </td>
              <td className='py-3 px-6 text-left'>South African</td>
            </tr>
            <tr className='border-b border-gray-200 hover:bg-gray-100'>
              <td className='py-3 px-6 text-left'>
                <span className='label label-info'>JM</span>
              </td>
              <td className='py-3 px-6 text-left'>Jamaican</td>
            </tr>
            <tr className='border-b border-gray-200 hover:bg-gray-100'>
              <td className='py-3 px-6 text-left'>
                <span className='label label-info'>WI</span>
              </td>
              <td className='py-3 px-6 text-left'>West Indian</td>
            </tr>
            <tr className='border-b border-gray-200 hover:bg-gray-100'>
              <td className='py-3 px-6 text-left'>
                <span className='label label-info'>AG</span>
              </td>
              <td className='py-3 px-6 text-left'>Aboriginal</td>
            </tr>
            <tr className='border-b border-gray-200 hover:bg-gray-100'>
              <td className='py-3 px-6 text-left'>
                <span className='label label-info'>SC</span>
              </td>
              <td className='py-3 px-6 text-left'>Scottish</td>
            </tr>
            <tr className='border-b border-gray-200 hover:bg-gray-100'>
              <td className='py-3 px-6 text-left'>
                <span className='label label-info'>NP</span>
              </td>
              <td className='py-3 px-6 text-left'>Nepalese</td>
            </tr>
            <tr className='border-b border-gray-200 hover:bg-gray-100'>
              <td className='py-3 px-6 text-left'>
                <span className='label label-info'>EG</span>
              </td>
              <td className='py-3 px-6 text-left'>Egyptian</td>
            </tr>
            <tr className='border-b border-gray-200 hover:bg-gray-100'>
              <td className='py-3 px-6 text-left'>
                <span className='label label-info'>AI</span>
              </td>
              <td className='py-3 px-6 text-left'>Indigenous American</td>
            </tr>
            <tr className='border-b border-gray-200 hover:bg-gray-100'>
              <td className='py-3 px-6 text-left'>
                <span className='label label-info'>N/A</span>
              </td>
              <td className='py-3 px-6 text-left'>
                Unsure/Unknown/Not Applicable
              </td>
            </tr>
            <tr className='border-b border-gray-200 hover:bg-gray-100'>
              <td className='py-3 px-6 text-left'>
                <span className='label label-info'>NN</span>
              </td>
              <td className='py-3 px-6 text-left'>Other Non-native/Mixed</td>
            </tr>
          </tbody>
        </table>
        <br />
        <p className='text-slate-500'>
          We have extensively tested this algorithm and these ranges are
          accurate to +/- 5%. This algorithm is based on a Linear Regression
          model which predicts how many words in the automated transcript are
          likely to be wrong based on all the files which we delivered in the
          last 3 months.
        </p>
        <br />
        <br />
      </div>
    ),
  },
  {
    id: 'performance',
    Content: () => (
      <div className='pt-0' id='performance'>
        <div className='mb-3'>
          <h3 className='text-black text-xl'>Performance</h3>
        </div>
        <br />
        <p className='text-slate-500'>
          The Overall Grade has to be maintained above 4 at all times. QC will
          be disabled otherwise.
        </p>
        <br />
        <p className='text-slate-500'>
          QC submissions may also be audited. The submission will be converted
          to a Proofreading assignment, QC&apos;ed again and graded as a
          Proofreading file. It may therefore affect your Overall Grade.
        </p>
        <br />
        <p className='text-slate-500'>
          QC submission may be rejected if the{' '}
          <a href='' className='text-blue:500 underline'>
            process
          </a>{' '}
          was not followed correctly. The diff and the player history are used
          to determine that. Submissions may also be rejected because of
          customer complaints. Rejected submissions are not paid and may also
          lead to permanent disabling of QC.
        </p>
        <br />
        <p className='text-slate-500'>
          You will be the last person to look at the file before it is sent to
          the customer. To reach this stage, you would have spent a lot of time
          and effort on Scribie. Therefore we trust you to never deliver a bad
          file to the customer.
        </p>
        <br />
        <p className='text-slate-500'>
          Please also note that the accountability for the file rests on the QC;
          not the Transcriber/Reviewers/Proofreaders.
        </p>
        <br />
      </div>
    ),
  },
  {
    id: 'process',
    Content: () => (
      <div className='pt-0' id='process'>
        <div className='mb-3'>
          <h3 className='text-black text-xl'>QC Process</h3>
        </div>
        <br />
        <p className='text-slate-500'>
          The primary goal of QC is to assess the accuracy level of the
          transcript. The secondary goal is correct mistakes as much as possible
          so that it meets or exceeds the quality criteria. Just as in
          Proofreading, you have to go through the full transcript and match it
          with the audio. All mistakes found have to be corrected. Based on the
          diffs, player history and the types of changes made, it will either be
          delivered to the customer or QC&apos;ed again. If it is QC&apos;ed
          again, it will be marked as proofread by you and appear in your
          Proofreading history tab.
        </p>
        <br />
        <p className='text-slate-500'>
          Re-proofreading is exactly the same as Proofreading, except that the
          files might be longer and already proofread once. You have to
          normalize the speaker labels and go through the file and submit it.
        </p>
        <br />
      </div>
    ),
  },
  {
    id: 'speaker-names',
    Content: () => (
      <div className='pt-0' id='speaker-names'>
        <div className='mb-3'>
          <h3 className='text-black text-xl'>Speaker Names</h3>
        </div>
        <br />
        <p className='text-slate-500'>
          Speaker names have to be updated before submitting the QC assignment.
          Our customers are very specific about names and therefore it is
          important that you update them. The requirements are different for
          everyone and therefore we have the following rules to ensure
          consistency. Please follow the rules below to determine the speaker
          name.
        </p>
        <br />
        <ol className='list-disc pl-5 text-slate-500'>
          <li>
            The name as spoken in the audio, if no customer instruction is
            present.
          </li>
          <li>The name as mentioned in the customer instructions.</li>
          <li>
            If the customer instructions (CI) explicitly stated that we should
            use the names they listed in the CI instead of the names mentioned
            in the audio, then that CI should be followed.
          </li>
          <li>
            Leave blank otherwise. Do NOT use Interviewer/Interviewee or any
            other format unless specified explicitly by the customer.
          </li>
        </ol>
        <p className='text-slate-500'>
          We follow the three strikes policy for customer complaints regarding
          speaker names and your account will be disabled if these rules are
          violated, either wilfully or due to negligence.
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
          We also provide tools in the Editor to help with speaker tracking. The
          tool loads 3 voice clips from each speaker in the file as predicted by
          our AI in the backend. You have to play the clips and re-arrange them
          by each speaker. Drag and drop the clip into the correct row of the
          table to re-arrange them. Our AI is conversative and predicts
          duplicate speakers if the voices are similar. This tool helps to
          remove the duplicate speakers and correct the labelling.
        </p>
        <br />
        <p className='text-slate-500'>
          The speaker tracking tool presumes that the paragraphs are broken at
          each speaker turn. If not, it can lead to multiple voices in the same
          paragraph which has to be manually corrected as you go through the
          file. Therefore, we recommend that you run this tool at the start
          before making any edits.
        </p>
        <br />
        <p className='text-slate-500'>
          This tool will also join consecutive paragraphs of the same speaker
          and break long paragraphs. You can however undo/redo the changes made
          by this tool with Ctrl+Z and Ctrl+Y.
        </p>
        <br />
        <p className='text-slate-500'>
          A speaker identification tool is also available for individual
          paragraphs. Right click on a paragraph and choose Identify Speakers
          from the dropdown. This tool loads the known speaker clips (in blue)
          and one clip from the current paragraph (in green). You have to match
          the green clip with the blue one and drag and drop it to the correct
          row to update the speaker label.
        </p>
        <br />
        <p className='text-slate-500'>
          We recommend that you run this tool before you make any edits to the
          file.
        </p>
        <br />
      </div>
    ),
  },
  {
    id: 't&c',
    Content: () => (
      <div className='pt-0' id='t&c'>
        <div className='mb-3'>
          <h3 className='text-black text-xl'>Terms & Phrase Analysis</h3>
        </div>
        <br />
        <p className='text-slate-500'>
          Terms & Phrase analysis is used extensively during QC. This analysis
          underlines the most uncommon words and phrases in the file as a hint.
          These terms were not found in any of the previous files by the
          customer or all our previous files in case of a new customer. Some
          files, therefore, have a lot of underlines and other files have fewer.
          In our testing, we have found that around 20% of these underlines are
          actual mistakes. Others are correct and are new terms and phrases.
        </p>
        <br />
        <p className='text-slate-500'>
          The underlines are always in blue so as to distinguish it from the
          spelling mistakes which are in red. The underlines can be removed for
          any paragraph by whitelisting. Right-click on the paragraph and choose
          Whitelist Terms in the dropdown menu. You can also blacklist a term or
          phrase and those will always be underlined in your files.
        </p>
        <br />
        <p className='text-slate-500'>
          Since only a few of the underlines are likely to be mistakes, the
          editor automatically whitelists the terms for paragraphs which are
          played during QC, provided the shortcuts are used. The assumption is
          that since you will be checking the full paragraph, all mistakes will
          be corrected and those hints are not required. By the end of QC , only
          those paragraphs which were not played will have the underlines. The
          last step therefore is to scan those underlines to see if anything
          important was missed.
        </p>
        <br />
        <p className='text-slate-500'>
          On delivery, these new terms and phrases will be added to our database
          and excluded in future.
        </p>
        <br />
      </div>
    ),
  },
  {
    id: 'useful-shortcuts',
    Content: () => (
      <div className='pt-0' id='useful-shortcuts'>
        <div className='mb-3'>
          <h3 className='text-black text-xl'>Useful Shortcuts</h3>
        </div>
        <br />
        <p className='text-slate-500'>
          The following are some shortcuts specifically designed for QC. Both
          those shortcuts have button equivalents as well (the first two buttons
          on the second row of buttons in the editor).
        </p>
        <br />
        <ol className='list-disc pl-5 text-slate-500'>
          <li>
            Alt+R jumps to a random paragraph in the current part being played.
            Can be used multiple times to check any part.
          </li>
          <li>Alt+F jumps to a random paragraph in the next part.</li>
          <li>
            Alt+W whitelists all the underlined terms and phrases in the current
            paragraph
          </li>
          <li>
            Ctrl+Alt+N plays audio from the beginning of the current paragraph.
            Very useful while blank checks, where you want to check the whole
            paragraph instead.
          </li>
        </ol>
        <br />
        <p className='text-slate-500'>
          Also refer to the shortcuts in the Proofreading Guide. You may find
          that useful in QC as well
        </p>
      </div>
    ),
  },
  {
    id: 'common-mistakes',
    Content: () => (
      <div className='pt-0' id='common-mistakes'>
        <div className='mb-3'>
          <h3 className='text-black text-xl'>Common Mistakes</h3>
        </div>
        <br />
        <p className='text-slate-500'>
          The focus during QC should be to find and correct the major mistakes.
          A major mistake is a change which alters the meaning, i.e, a
          contextual mistake, a sound-alike, etc. Correcting these mistakes will
          improve the accuracy of the transcript significantly.
          Insertion/removal of fillers, interjections, false starts, etc., are
          not going to improve the accuracy by much and will end up consuming
          too much time and effort.
        </p>
        <br />
        <p className='text-slate-500'>
          The most common mistake is getting stuck any point. We recommend that
          you to insert a blank and move on instead. Then do a blank check
          before submission.
        </p>
        <br />
        <p className='text-slate-500'>
          If speaker tracking is wrong, especially for 2 or 3 speaker files, it
          is a strong indication that the proofreading has not been done
          correctly. The proofreader may have skipped that part or not paid
          attention. The player history should corroborate that. Customers
          always complain if speaker tracking is wrong. Therefore speaker
          tracking mistakes should be considered major.
        </p>
        <br />
        <p className='text-slate-500'>
          Consistency of acronyms and special terms and phrases is also
          important. It is also an indication that proofreading has not be done
          correctly.
        </p>
        <br />
        <p className='text-slate-500'>
          Blanks are not considered a mistake. This differs from reviews where
          blanks which are filled are considered a mistake. In proofreading,
          however, we specifically instruct our proofreaders to leave a blank
          wherever they have any doubt so that it can be checked during QC.
        </p>
        <br />
        <p className='text-slate-500'>
          Background conversations should be transcribed for strict verbatim
          files.
        </p>
        <br />
        <p className='text-slate-500'>
          The accuracy level of the file cannot be predicted by the stats of the
          proofreader/QCs who have worked on the file. Do not use that as the
          sole criterion for judging a file. Even good proofreaders have a bad
          day and can make mistakes. The file should be judged only by the
          mistakes in it and not the past work history.
        </p>
      </div>
    ),
  },
  {
    id: 'player-history',
    Content: () => (
      <div className='pt-0' id='player-history'>
        <div className='mb-3'>
          <h3 className='text-black text-xl'>Player History</h3>
        </div>
        <br />
        <p className='text-slate-500'>
          We provide player history of the proofreading file during QC. The
          option is available in the dropdown menu next to the timer. It
          provides a summary of parts of the audio which were played during
          proofreading. This, combined with the part file diffs can be used to
          assess whether the proofreading procedure was followed correctly. Most
          of the time, there will be some changes in parts which were played.
          The parts which were not played should be sampled first.
        </p>
        <br />
        <p className='text-slate-500'>
          We also collect player history data during QC. The data contains
          information about which parts of the audio were played and when. This
          data is submitted along with the file and used for performance
          monitoring and audits. QC has to be done using the online editor and
          cannot be submitted without a player history.
        </p>
        <br />
        <p className='text-slate-500'>
          Player history also is used to detect inactivity. If no audio is
          played for more than 2 minutes, the editor will automatically close.
          Please re-open the editor whenever you&apos;re ready to start again.
        </p>
        <br />
      </div>
    ),
  },
  {
    id: 'timeouts',
    Content: () => (
      <div className='pt-0' id='timeouts'>
        <div className='mb-3'>
          <h3 className='text-black text-xl'>Timeouts</h3>
        </div>
        <br />
        <p className='text-slate-500'>
          Each QC assignment has a timeout equal to the duration of the file for
          each step. The timeout can be extended once after the allotted time
          has elapsed. The extension granted is half the duration of the audio
          file. Therefore in total, the assignment has to be submitted within 3
          times the duration of the file, i.e., 3 hours for a 1-hour file.
        </p>
        <br />
        <p className='text-slate-500'>
          The Request Extension option is available in the dropdown menu next to
          the timer. It is enabled only when the initial time has elapsed, i.e.,
          when the timer starts blinking. A grace period between 10-15 minutes
          is also granted once the timer starts blinking. The timeout may occur
          anytime after the first 10 minutes of the grace period.
        </p>
        <br />
        <p className='text-slate-500'>
          Once a file times out, the file can be re-assigned from the history
          tab and re-submitted within the grace period, provided it is still
          available. Assignments will also time out after 30 minutes of
          continued inactivity. Please cancel if you do not wish to continue
          working on the file to avoid the timeout.
        </p>
        <br />
      </div>
    ),
  },
  {
    id: 'get-started',
    Content: () => (
      <div className='pt-0' id='get-started'>
        <div className='mb-3'>
          <h3 className='text-black text-xl'>Get Started</h3>
        </div>
        <br />
        <p className='text-slate-500'>
          Each QC assignment has a timeout equal to the duration of the file for
          each step. The timeout can be extended once after the allotted time
          has elapsed. The extension granted is half the duration of the audio
          file. Therefore in total, the assignment has to be submitted within 3
          times the duration of the file, i.e., 3 hours for a 1-hour file.
        </p>
        <br />
        <p className='text-slate-500'>
          The Request Extension option is available in the dropdown menu next to
          the timer. It is enabled only when the initial time has elapsed, i.e.,
          when the timer starts blinking. A grace period between 10-15 minutes
          is also granted once the timer starts blinking. The timeout may occur
          anytime after the first 10 minutes of the grace period.
        </p>
        <br />
        <p className='text-slate-500'>
          Once a file times out, the file can be re-assigned from the history
          tab and re-submitted within the grace period, provided it is still
          available. Assignments will also time out after 30 minutes of
          continued inactivity. Please cancel if you do not wish to continue
          working on the file to avoid the timeout.
        </p>
        <br />
      </div>
    ),
  },
]

export default function Page() {
  const rightSidebarRef = useRef<HTMLElement | null>(null) // Create a ref for the right sidebar

  const scrollToSection = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault()
    const targetId = event.currentTarget.getAttribute('href')?.slice(1)
    const targetElement = targetId ? document.getElementById(targetId) : null
    if (targetElement && rightSidebarRef.current) {
      const topPos = targetElement.offsetTop - rightSidebarRef.current.offsetTop
      rightSidebarRef.current.scrollTo({
        top: topPos,
        behavior: 'smooth',
      })
    }
  }
  return (
    <div className='flex gap-8 w-[80%] h-screen mx-[10%] m-auto relative'>
      {/* Adjust the sidebar container styles */}
      <div className='h-[100%] flex lg:flex-col space-x-0 space-y-1 min-w-[20%] absolute left-0 top-0 z-1 overflow-y-auto overscroll-y-scroll no-scrollbar'>
        {sidebarItems.map((item) => (
          <a
            key={item.link}
            href={item.link}
            onClick={scrollToSection}
            className={`flex items-center gap-2.5 rounded-lg py-2 transition-all`}
          >
            {item.name}
          </a>
        ))}
      </div>

      {/* Main content container (unchanged) */}
      <div
        ref={rightSidebarRef as LegacyRef<HTMLDivElement> | undefined}
        className='h-[100%] flex space-x-2 lg:flex-col lg:space-x-0 font-medium overflow-auto w-[80%] absolute top-0 right-0  overflow-y-auto overscroll-y-contain no-scrollbar'
      >
        {content.map((item, index) => {
          const Content = item.Content
          return (
            <div key={index}>
              <Content />
            </div>
          )
        })}
      </div>
    </div>
  )
}
