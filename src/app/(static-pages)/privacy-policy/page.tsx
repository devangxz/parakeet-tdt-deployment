import Link from 'next/link'

export default function Page() {
  const sections = [
    {
      title: '1. Cookies',
      content:
        "A cookie is a small amount of data that is sent to your browser from our servers and stored on your computer's hard drive. We use cookies to access information when you sign in, store your preferences, and to keep you logged in. You can configure your browser to accept or reject these cookies.",
    },
    {
      title: '2. Information Sharing',
      content: (
        <>
          Scribie Technologies, Inc. does not sell, rent or share personal
          information with any third parties under any circumstances. We may,
          however, disclose personal information when we believe it violates our{' '}
          <Link
            href='/terms'
            className='text-primary hover:text-primary-dark underline'
          >
            Terms of Service
          </Link>{' '}
          or is appropriate to comply with the law, to protect our or our
          user&apos;s rights, as well as to protect our users from fraudulent,
          abusive, and unlawful use of our site. We reserve the right to
          disclose your personally identifiable information as required by law
          and when we believe that disclosure is necessary to protect our rights
          and/or to comply with a judicial proceeding, court order, or legal
          process served on our website.
        </>
      ),
    },
    {
      title: '3. Client Data & Storage',
      content:
        'Scribie Technologies, Inc. ensures that all the files, transcripts and data remain private and confidential. Access is restricted strictly on a need to know basis to our employees and contractors. All employees and contractors are required to sign a Non Disclousure Agreement before being allowed access to the data. Due to the sensitive nature of the recordings and transcripts we take privacy very seriously and make it our primary concern for all our customers.',
    },
    {
      title: '4. Information Security',
      content:
        'We restrict access of information to Scribie Technologies, Inc. employees, contractors and agents who need to know that information in order to operate, develop or improve our transcription service. These individuals are bound by confidentiality obligations and may be subject to discipline, including termination and criminal prosecution, if they fail to meet these obligations.',
    },
    {
      title: '5. Changes',
      content:
        'Scribie Technologies, Inc. will notify customers by email about any significant changes in this policy. Please contact support in case you detect a breach of your account or any unauthorized use. You may also delete your account from the settings page anytime you wish. You may have to clear any dues and cancel any in-progress orders or Service.',
    },
  ]

  return (
    <section className='min-h-screen'>
      <div className='relative mx-auto max-w-7xl mt-16 sm:mt-20 md:mt-24 px-4 sm:px-6 lg:px-8 pb-10 lg:pb-20'>
        <header className='text-center'>
          <h1 className='text-4xl md:text-5xl lg:text-6xl font-bold text-foreground max-w-3xl lg:max-w-5xl mx-auto leading-tight md:leading-[1.3] lg:leading-[1.1]'>
            Privacy Policy
          </h1>
          <p className='mt-4 sm:mt-6 lg:mt-8 text-gray-700 max-w-sm sm:max-w-xl lg:max-w-2xl mx-auto text-base sm:text-lg'>
            Effective date: 8th April, 2016
          </p>
        </header>

        <main className='mt-16 sm:mt-24 md:mt-28'>
          <section className='mb-12 space-y-5'>
            <h3 className='text-2xl font-semibold text-foreground'>
              Welcome to Scribie
            </h3>
            <div className='space-y-4'>
              <p className='text-gray-600'>
                We collect personal information in a number of ways when you
                visit our site or use our service. For example, you provide us
                with personal information when you register for an account or
                contact us by email. Scribie Technologies, Inc. automatically
                receives and records information from your browser, including
                your IP address and cookies. The personal information collected
                is used for billing, identification, authentication, service
                improvement, research, and contact.
              </p>
              <p className='text-gray-600'>
                We are committed to conducting our business in accordance with
                these principles in order to ensure that the confidentiality of
                personal information is protected and maintained.
              </p>
              <p className='text-gray-600'>
                If you have questions or concerns about Scribie Technologies,
                Inc.&apos;s Privacy Policy please send us a message here.
              </p>
            </div>
          </section>

          <section className='space-y-12'>
            {sections.map((section, index) => (
              <div key={index} className='group'>
                <div className='border-l-4 border-primary pl-6 space-y-3'>
                  <h5 className='text-xl font-semibold text-foreground'>
                    {section.title}
                  </h5>
                  <div className='text-gray-600'>{section.content}</div>
                </div>
              </div>
            ))}
          </section>
        </main>
      </div>
    </section>
  )
}
