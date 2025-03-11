export function getRedirectPathByRole(role: string) {
  switch (role) {
    case 'ADMIN':
      return '/admin/dashboard'
    case 'TRANSCRIBER':
      return '/transcribe/transcriber'
    case 'TRANSCRIBER_LEVEL_2':
      return '/transcribe/transcriber'
    case 'PROOFREADER':
      return '/transcribe/transcriber'
    case 'VERIFIER':
      return '/transcribe/transcriber'
    case 'QC':
      return '/transcribe/qc'
    case 'REVIEWER':
      return '/transcribe/legal-cf-reviewer'
    case 'CUSTOMER':
      return '/files/upload'
    case 'OM':
      return '/admin/dashboard'
    default:
      return '/'
  }
}
