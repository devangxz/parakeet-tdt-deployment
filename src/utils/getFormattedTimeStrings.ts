import { format, parseISO } from "date-fns"

export const getFormattedTimeStrings = (ts: string) => {
    const date = parseISO(ts)
    const formattedDate = format(date, 'hh:mm aa, dd/MM/yyyy')
    const timeString = formattedDate.split(',')[0]
    const dateString = formattedDate.split(',')[1]
    return { timeString, dateString }
}