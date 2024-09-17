import { LOCALE } from '@/constants'

function formatDateTime(dateString: string) {
  const date = new Date(dateString)

  const time = date.toLocaleTimeString(LOCALE, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
  const formattedDate = date.toLocaleDateString(LOCALE, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  return `${time}, ${formattedDate}`
}

export default formatDateTime
