'use client'

import ReCAPTCHA from 'react-google-recaptcha'
import { toast } from 'sonner'

import { verifyRecaptcha } from '@/app/actions/recaptcha'

function Recaptcha({ setCaptcha }: { setCaptcha: (value: boolean) => void }) {
  const reCaptch_sitekey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY

  const handleRecaptcha = async (value: string | null) => {
    if (!value) return

    try {
      const response = await verifyRecaptcha(value)
      if (response.success) {
        setCaptcha(true)
      } else {
        setCaptcha(false)
        toast.error('CAPTCHA verification failed. Please try again.')
      }
    } catch (err) {
      toast.error('Error verifying CAPTCHA. Please try again.')
      setCaptcha(false)
    }
  }

  return (
    <ReCAPTCHA
      className='my-7 w-[350px]'
      sitekey={reCaptch_sitekey ?? ''}
      onChange={handleRecaptcha}
      data-testid='recaptcha'
    />
  )
}

export default Recaptcha
