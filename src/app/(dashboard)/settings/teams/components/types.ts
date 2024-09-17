export const TeamMemberRole = {
  USER: 'User',
  SUPERVISOR: 'Supervisor',
  MANAGER: 'Manager',
  TEAM_ADMIN: 'Team Admin',
  SUPER_ADMIN: 'Super Admin',
} as const

export type TeamMemberRoleType = keyof typeof TeamMemberRole

export interface TeamMember {
  isGroupAdmin: boolean
  fullname: string
  email: string
  status: string
  userId: number
  teamId: number
  role: TeamMemberRoleType
}

export interface InvitationDetails {
  teamId: number
  teamName: string
  adminName: string
  adminEmail: string
}
