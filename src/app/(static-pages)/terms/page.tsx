export default function Page() {
  const mainSections = [
    {
      title: 'A. Personal Data',
      content: (
        <>
          <p>
            Personal Data is any information that relates to an identified or
            identifiable individual. The Personal Data that you provide directly
            to us through our Sites will be apparent from the context in which
            you provide the data. In particular:
          </p>
          <ul className='list-disc pl-6 mt-4 space-y-2'>
            <li>
              When you register for a Scribie account we collect your full name,
              email address, IP Addresses, browser fingerpring and account
              log-in credentials.
            </li>
            <li>
              When you fill-in our online form to contact our sales team, we
              collect your full name, work email, country, and anything else you
              tell us about your project, needs and timeline.
            </li>
            <li>
              When you use the &ldquo;Remember Me&rdquo; feature of Scribie
              account, we collect your email address, password, IP Address and
              cookie preferences.
            </li>
          </ul>
          <p className='mt-4'>
            When you respond to Scribie emails or surveys we collect your email
            address, name and any other information you choose to include in the
            body of your email or responses. If you contact us by phone, we will
            collect the phone number you use to call Scribie. If you contact us
            by phone as a Scribie User, we may collect additional information in
            order to verify your identity.
          </p>
        </>
      ),
    },
    {
      title: 'B. Collected Information',
      content: (
        <>
          <p>
            We also may collect information about your online activities on
            websites and connected devices over time and across third-party
            websites, devices, apps and other online features and services. We
            use Google Analytics on our Sites to help us analyze Your use of our
            Sites and diagnose technical issues.
          </p>
          <p className='mt-4'>
            To learn more about the cookies that may be served through our Sites
            and how You can control our use of cookies and third-party
            analytics, please see our Cookie Policy.
          </p>
        </>
      ),
    },
  ]

  const subsections = [
    {
      title: '1. Cookies',
      content:
        "A cookie is a small amount of data that is sent to your browser from our servers and stored on your computer's hard drive. We use cookies to access information when you sign in, store your preferences, and to keep you logged in. You can configure your browser to accept or reject these cookies.",
    },
    {
      title: '2. Privacy & Copyright Protection',
      content: (
        <>
          <p>
            Scribie&apos;s privacy policies explain how we treat your personal
            data and protect your privacy when you use our Services. By using
            our Services, you agree that Scribie can use such data in accordance
            with our privacy policies.
          </p>
          <p className='mt-4'>
            We respond to notices of alleged copyright infringement and
            terminate accounts of repeat infringers according to the process set
            out in the U.S. Digital Millennium Copyright Act.
          </p>
          <p className='mt-4'>
            We provide information to help copyright holders manage their
            intellectual property online. If you think somebody is violating
            your copyrights and want to notify us, you can find information
            about submitting notices and Scribie&apos;s policy about responding
            to notices in our Help Center.
          </p>
        </>
      ),
    },
    {
      title: '3. Derivative Products',
      content: (
        <>
          <p>
            Some of our Services allow you to upload, submit, store, send or
            receive content. You retain ownership of any intellectual property
            rights that you hold in that content. In short, what belongs to you
            stays yours.
          </p>
          <p className='mt-4'>
            When you upload, submit, store, send or receive content to or
            through our Services, you give Scribie (and those we work with) a
            worldwide license to use and create derivative works (such as those
            resulting from machine learning models or other statistical models
            we make so that your content works better with our Services). The
            rights you grant in this license are for the limited purpose of
            operating, promoting, and improving our Services, and to develop new
            ones. This license continues even if you stop using our Services.
            Some Services may offer you ways to access and remove content that
            has been provided to that Service. Also, in some of our Services,
            there are terms or settings that narrow the scope of our use of the
            content submitted in those Services. Make sure you have the
            necessary rights to grant us this license for any content that you
            submit to our Services.
          </p>
          <p className='mt-4'>
            Some of our Services allow you to upload, submit, store, send or
            receive content. You retain ownership of any intellectual property
            rights that you hold in that content. In short, what belongs to you
            stays yours.
          </p>
        </>
      ),
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
            Terms of Service
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
                Thanks for using our products and services
                (&ldquo;Services&rdquo;). The Services are provided by Scribie
                Technologies Inc. (&ldquo;Scribie&rdquo;), located at 2261
                Market Street, #22612, San Francisco, CA 94114, United States.
              </p>
              <p className='text-gray-600'>
                By using our Services, you are agreeing to these terms including
                any subsequent changes or modifications. Please read them
                carefully. If you do not agree to these Terms or our Privacy
                Policy, please do not use the Scribie.com website or any of our
                Services and products.
              </p>
              <p className='text-gray-600'>
                Our Services are very diverse, so sometimes additional terms or
                product requirements (including age requirements) may apply.
                Additional terms will be available with the relevant Services,
                and those additional terms become part of your agreement with us
                if you use those Services.
              </p>
            </div>
          </section>

          <section className='space-y-12 mb-12'>
            {mainSections.map((section, index) => (
              <div key={index} className='group bg-secondary rounded-lg p-8'>
                <div className='space-y-4'>
                  <h5 className='text-xl font-bold text-primary'>
                    {section.title}
                  </h5>
                  <div className='text-gray-600'>{section.content}</div>
                </div>
              </div>
            ))}
          </section>

          <section className='space-y-12'>
            {subsections.map((section, index) => (
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
