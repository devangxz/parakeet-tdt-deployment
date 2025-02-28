'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import ReCAPTCHA from 'react-google-recaptcha'
// import { toast } from 'sonner'

import { verifyRecaptcha } from '@/app/actions/recaptcha'

function Recaptcha({ setCaptcha }: { setCaptcha: (value: boolean) => void }) {
  const reCaptch_sitekey = '6Lf53DwqAAAAACd_p9uw1si7V7r3qDjRgU3Celao'
  const { theme, systemTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [key, setKey] = useState(0)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted) {
      setKey((prev) => prev + 1)
    }
  }, [theme, systemTheme, mounted])

  const currentTheme = theme === 'system' ? systemTheme : theme

  const handleRecaptcha = async (value: string | null) => {
    if (!value) return

    try {
      const response = await verifyRecaptcha(value)
      if (response.success) {
        setCaptcha(true)
      } else {
        //disable captcha for now
        setCaptcha(true)
        // setCaptcha(false)
        // toast.error('CAPTCHA verification failed. Please try again.')
      }
    } catch (err) {
      //disable captcha for now
      setCaptcha(true)
      // toast.error('Error verifying CAPTCHA. Please try again.')
      // setCaptcha(false)
    }
  }

  if (!mounted) {
    return null
  }

  return (
    <ReCAPTCHA
      key={key}
      className='my-7 w-[350px]'
      sitekey={reCaptch_sitekey ?? ''}
      onChange={handleRecaptcha}
      data-testid='recaptcha'
      theme={currentTheme === 'dark' ? 'dark' : 'light'}
    />
  )
}

export default Recaptcha
