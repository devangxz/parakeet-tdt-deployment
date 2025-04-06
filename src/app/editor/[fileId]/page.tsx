import dynamic from 'next/dynamic'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'

// Import the EditorPage component with dynamic import to ensure it's only loaded client-side
const EditorPageClient = dynamic(
  () => import('@/components/editor/EditorPage'),
  { ssr: false } // Disable server-side rendering since it uses browser APIs
)

export default async function EditorPage() {
  const session = await getServerSession(authOptions)
  
  const ALLOWED_ROLES = ['QC', 'REVIEWER', 'ADMIN', 'OM', 'CUSTOMER', 'TRANSCRIBER']

  if (!session?.user) {
    logger.info('Unauthorized access attempt to editor - no session')
    redirect('/auth/login')
  }
  
  if (!ALLOWED_ROLES.includes(session.user.role)) {
    logger.info(`Unauthorized role accessing editor: ${session.user.role}, userId: ${session.user.userId}`)
    redirect('/')
  }

  return <EditorPageClient />
}
