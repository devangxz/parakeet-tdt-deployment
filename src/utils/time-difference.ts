export function calculateDifferenceInHours(createdAt: Date) {
  const createdAtDate = new Date(createdAt)

  const currentDate = new Date()

  const differenceInMilliseconds: number =
    currentDate.getTime() - createdAtDate.getTime()

  const differenceInHours = differenceInMilliseconds / (1000 * 60 * 60)

  return differenceInHours
}
