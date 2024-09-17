const getInitials = (name: string) => {
  const nameParts = name.split(' ')
  let initials = nameParts[0].charAt(0)
  if (nameParts.length > 1) {
    initials += nameParts[1].charAt(0)
  } else {
    initials += nameParts[0].charAt(1)
  }

  return initials.toUpperCase()
}

export default getInitials
