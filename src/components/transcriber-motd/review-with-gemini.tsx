import dynamic from 'next/dynamic'

const Motd = dynamic(
  async () => {
    const { useState, useEffect } = await import('react')
    function MotdClient() {
      const [showMotd, setShowMotd] = useState(false)
      const [slideIn, setSlideIn] = useState(false)

      useEffect(() => {
        if (!localStorage.getItem('reviewWithGeminiMotdDismissed')) {
          setShowMotd(true)
          setTimeout(() => setSlideIn(true), 10)
        }
      }, [])

      function handleClose() {
        setSlideIn(false)
        setTimeout(() => {
          setShowMotd(false)
          localStorage.setItem('reviewWithGeminiMotdDismissed', 'true')
        }, 300)
      }

      if (!showMotd) return null

      return (
        <div
          className={`fixed top-0 inset-x-0 z-50 transform transition-transform duration-300 ease-out ${
            slideIn ? 'translate-y-0' : '-translate-y-full'
          } bg-primary/80`}
        >
          <div className='mx-auto px-10 py-2 flex items-center justify-between'>
            <span className='text-white'>
              New Feature Alert! We’ve introduced a new feature: “Check with
              Gemini” in the QC stage! Try it out from the dropdown menu in the
              editor and let us know your valuable feedback.
            </span>
            <button
              className='text-white hover:text-gray-300'
              onClick={handleClose}
              aria-label='Close message'
            >
              ✕
            </button>
          </div>
        </div>
      )
    }
    return MotdClient
  },
  { ssr: false }
)

export default Motd
