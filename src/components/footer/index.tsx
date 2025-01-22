'use client'

import {
  MapPin,
  Phone,
  ExternalLink,
  Linkedin,
  Twitter,
  Facebook,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

const companyLinks = [
  { href: '/about-us', label: 'About Us' },
  { href: 'https://scribie.com/blog/', label: 'Blog' },
  { href: '/get-quote', label: 'Get a Quote' },
  { href: '/privacy-policy', label: 'Privacy & Policy' },
  { href: '/terms', label: 'Terms' },
]

const accountLinks = [
  { href: '/signin', label: 'Log In' },
  { href: '/files/all-files', label: 'Files' },
]

const resourceLinks = [
  { href: '/docs', label: 'API Reference' },
  { href: '/faq', label: 'FAQs' },
  { href: '/contact', label: 'Support' },
]

const comparisonLinks = [
  {
    href: 'https://scribie.com/blog/2019/06/rev-scribie-comparison/',
    label: 'With Rev',
  },
  {
    href: 'https://scribie.com/blog/2019/09/scribie-gotranscript-business-transcription/',
    label: 'With GoTranscript',
  },
]

const Footer = () => (
  <footer className='relative pt-16 pb-14 bg-gradient-to-br from-primary-dark/95 to-primary-dark/90'>
    <div className='absolute inset-0'>
      <div className='absolute inset-0 bg-[linear-gradient(to_right,#c7d2fe_1px,transparent_1px),linear-gradient(to_bottom,#c7d2fe_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)] opacity-[0.15]' />
    </div>
    <div className='relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
      <div className='pb-6 grid grid-cols-1 lg:grid-cols-12 gap-12'>
        <div className='relative -top-1.5 lg:col-span-4'>
          <div className='flex items-center mb-[11px]'>
            <div className='flex-shrink-0'>
              <Image
                className='h-12 w-12'
                src='/assets/images/logo-white-variant.svg'
                alt='scribie.ai'
                width={48}
                height={48}
                loading='lazy'
              />
            </div>
            <h3 className='text-3xl font-semibold text-primary-foreground ml-3'>
              scribie.ai
            </h3>
          </div>

          <p className='text-primary-foreground/95 text-base mb-6'>
            Empowering businesses with AI-powered transcription services since
            2008.
          </p>

          <div className='space-y-4 mb-4'>
            <div className='flex items-center gap-3 text-primary-foreground'>
              <div className='p-2 bg-primary/60 rounded-lg'>
                <MapPin size={18} className='text-primary-foreground/90' />
              </div>
              <span className='text-sm'>
                2261 Market Street, #22612, San Francisco, CA 94114, United
                States
              </span>
            </div>
            <div className='flex items-center gap-3 text-primary-foreground'>
              <div className='p-2 bg-primary/60 rounded-lg'>
                <Phone size={18} className='text-primary-foreground/90' />
              </div>
              <span className='text-sm'>+1 (866) 941 - 4131</span>
            </div>
          </div>

          <div className='flex gap-3'>
            <Link
              href='https://twitter.com/scribie_com'
              target='_blank'
              rel='noopener noreferrer'
              className='w-10 h-10 bg-primary/60 hover:bg-primary-foreground rounded-lg flex items-center justify-center transition-all duration-300 group'
            >
              <Twitter
                size={18}
                className='text-primary-foreground group-hover:text-primary'
              />
            </Link>
            <Link
              href='https://www.linkedin.com/company/scribie'
              target='_blank'
              rel='noopener noreferrer'
              className='w-10 h-10 bg-primary/60 hover:bg-primary-foreground rounded-lg flex items-center justify-center transition-all duration-300 group'
            >
              <Linkedin
                size={18}
                className='text-primary-foreground group-hover:text-primary'
              />
            </Link>
            <Link
              href='https://www.facebook.com/scribie.transcription'
              target='_blank'
              rel='noopener noreferrer'
              className='w-10 h-10 bg-primary/60 hover:bg-primary-foreground rounded-lg flex items-center justify-center transition-all duration-300 group'
            >
              <Facebook
                size={18}
                className='text-primary-foreground group-hover:text-primary'
              />
            </Link>
          </div>
        </div>

        <div className='lg:col-span-8'>
          <div className='grid grid-cols-2 sm:grid-cols-4 gap-8'>
            <div>
              <h3 className='text-lg font-semibold text-primary-foreground mb-6'>
                Company
              </h3>
              <ul className='space-y-4'>
                {companyLinks.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className='text-primary-foreground/90 hover:text-primary-foreground transition-all duration-300 flex items-center gap-2 group text-base'
                    >
                      <span>{link.label}</span>
                      <ExternalLink
                        size={14}
                        className='opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300'
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className='text-lg font-semibold text-primary-foreground mb-6'>
                Account
              </h3>
              <ul className='space-y-4'>
                {accountLinks.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className='text-primary-foreground/90 hover:text-primary-foreground transition-all duration-300 flex items-center gap-2 group text-base'
                    >
                      <span>{link.label}</span>
                      <ExternalLink
                        size={14}
                        className='opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300'
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className='text-lg font-semibold text-primary-foreground mb-6'>
                Resources
              </h3>
              <ul className='space-y-4'>
                {resourceLinks.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className='text-primary-foreground/90 hover:text-primary-foreground transition-all duration-300 flex items-center gap-2 group text-base'
                    >
                      <span>{link.label}</span>
                      <ExternalLink
                        size={14}
                        className='opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300'
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className='text-lg font-semibold text-primary-foreground mb-6'>
                Comparison
              </h3>
              <ul className='space-y-4'>
                {comparisonLinks.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className='text-primary-foreground/90 hover:text-primary-foreground transition-all duration-300 flex items-center gap-2 group text-base'
                    >
                      <span>{link.label}</span>
                      <ExternalLink
                        size={14}
                        className='opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300'
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className='border-t pt-6 border-primary-foreground/30'>
        <div className='text-sm text-primary-foreground/90 max-w-3xl mx-auto text-center'>
          When you visit or interact with our sites, services or tools, we or
          our authorised service providers may use cookies for storing
          information to help provide you with a better, faster and safer
          experience and for marketing purposes.
        </div>

        <div className='mt-6 text-primary-foreground/90 text-sm text-center'>
          © scribie. 2008-{new Date().getFullYear()} Scribie Technologies, Inc.
          All rights reserved.
        </div>
      </div>
    </div>
  </footer>
)

export default Footer
