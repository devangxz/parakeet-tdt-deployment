import Form from './form'
import prisma from '@/lib/prisma'

export default async function JoinTeamPage({
  params,
}: {
  params: { invite_key: string }
}) {
  const invite = await prisma.invite.findUnique({
    where: { inviteKey: params.invite_key },
    select: { email: true },
  })

  if (!invite) {
    return <div>Invalid invite key</div>
  }

  return <Form initialEmail={invite.email} />
}
