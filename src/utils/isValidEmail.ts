/**
 * @param {string} email - The email address to validate
 * @returns {boolean} - Returns true if the email is valid, otherwise false
 */
const isValidEmail = (email: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export default isValidEmail
