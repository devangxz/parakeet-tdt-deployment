import { useEffect } from 'react'

declare global {
  interface Window {
    BrevoConversationsID?: string
    c: {
      (command: string, ...args: string[]): void
      q?: unknown[]
    }
  }
}

function BrevoChatWidget() {
  useEffect(() => {
    window.BrevoConversationsID = process.env.NEXT_PUBLIC_BREVO_CONVERSATION_ID
    const script = document.createElement('script')
    script.async = true
    script.src = 'https://conversations-widget.brevo.com/brevo-conversations.js'
    script.onload = () => {
      window['c'] =
        window.c ||
        function (...args: unknown[]) {
          ;(window.c.q = window.c.q || []).push(...args)
        }
    }
    document.head.appendChild(script)

    return () => {
      document.head.removeChild(script)
      delete window.BrevoConversationsID
    }
  }, [])

  return null
}

export default BrevoChatWidget
