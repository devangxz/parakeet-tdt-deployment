export default function Page() {
  return (
    <div className='w-[100%]'>
      {/* First section  */}
      <div className='hidden bg-muted lg:block py-[5rem]'>
        <div className='grid gap-2 text-center'>
          <h1 className='text-4xl font-bold'>Privacy Policy</h1>
          <p className='text-balance text-muted-foreground'>
            Effective date: 8th April, 2016
          </p>
        </div>
      </div>

      <div className='space-y-[5rem] px-[10%] py-[5rem]'>
        <div className='space-y-[2rem]'>
          <p className='text-xl font-semibold'>Welcome to Scribie</p>
          <p className='text-slate-400'>
            We collect personal information in a number of ways when you visit
            our site or use our service. For example, you provide us with
            personal information when you register for an account or contact us
            by email. CGBiz Corporation automatically receives and records
            information from your browser, including your IP address and
            cookies. The personal information collected is used for billing,
            identification, authentication, service improvement, research, and
            contact.
          </p>

          <p className='text-slate-400'>
            We are committed to conducting our business in accordance with these
            principles in order to ensure that the confidentiality of personal
            information is protected and maintained.
          </p>

          <p className='text-slate-400'>
            If you have questions or concerns about CGBiz Corporation&apos;s
            Privacy Policy please send us a message here.
          </p>
        </div>

        <div className='space-y-[1rem]'>
          <p className=''>1. Cookies</p>
          <p className='text-slate-400'>
            A cookie is a small amount of data that is sent to your browser from
            our servers and stored on your computer&apos;s hard drive. We use
            cookies to access information when you sign in, store your
            preferences, and to keep you logged in. You can configure your
            browser to accept or reject these cookies.
          </p>
        </div>

        <div className='space-y-[1rem]'>
          <p className=''>2. Information Sharing</p>
          <p className='text-slate-400'>
            CGBiz Corporation does not sell, rent or share personal information
            with any third parties under any circumstances. We may, however,
            disclose personal information when we believe it violates our{' '}
            <a href='https://scribie.com/company/terms' target='#' className='text-blue-500 underline'>
              Terms of Service
            </a>{' '}
            or is appropriate to comply with the law, to protect our or our
            user&apos;s rights, as well as to protect our users from fraudulent,
            abusive, and unlawful use of our site. We reserve the right to
            disclose your personally identifiable information as required by law
            and when we believe that disclosure is necessary to protect our
            rights and/or to comply with a judicial proceeding, court order, or
            legal process served on our website.
          </p>
        </div>

        <div className='space-y-[1rem]'>
          <p className=''>3. Client Data & Storage</p>
          <p className='text-slate-400'>
            CGBiz Corporation ensures that all the files, transcripts and data
            remain private and confidential. Access is restricted strictly on a
            need to know basis to our employees and contractors. All employees
            and contractors are required to sign a Non Disclousure Agreement
            before being allowed access to the data. Due to the sensitive nature
            of the recordings and transcripts we take privacy very seriously and
            make it our primary concern for all our customers.
          </p>
        </div>

        <div className='space-y-[1rem]'>
          <p className=''>4. Information Security</p>
          <p className='text-slate-400'>
            We restrict access of information to CGBiz Corporation employees,
            contractors and agents who need to know that information in order to
            operate, develop or improve our transcription service. These
            individuals are bound by confidentiality obligations and may be
            subject to discipline, including termination and criminal
            prosecution, if they fail to meet these obligations.
          </p>
        </div>

        <div className='space-y-[1rem]'>
          <p className=''>5. Changes</p>
          <p className='text-slate-400'>
            CGBiz Corporation will notify customers by email about any
            significant changes in this policy. Please contact support in case
            you detect a breach of your account or any unauthorized use. You may
            also delete your account from the settings page anytime you wish.
            You may have to clear any dues and cancel any in-progress orders or
            Service.
          </p>
        </div>
      </div>
    </div>
  )
}
