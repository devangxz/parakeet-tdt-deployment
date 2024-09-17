export function getRedirectPathByRole(role: string) {
  switch (role) {
    case 'ADMIN':
      return '/admin/dashboard'
    case 'TRANSCRIBER':
      return '/transcribe/transcriber'
    case 'TRANSCRIBER_LEVEL_2':
      return '/transcribe/reviewer'
    case 'PROOFREADER':
      return '/transcribe/proofreader'
    case 'VERIFIER':
      return '/transcribe/proofreader'
    case 'QC':
      return '/transcribe/qc'
    case 'REVIEWER':
      return '/transcribe/legal-cf-reviewer'
    case 'CUSTOMER':
      return '/files/upload'
    default:
      return '/'
  }
}
