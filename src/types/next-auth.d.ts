// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Session } from 'next-auth'
declare module 'next-auth' {
  interface User {
    name: string
    user: string
    userId: number
    email: string
    role: string
    referralCode: string | null
    status: string
    customPlan: number
    internalTeamUserId: number | null
    teamName: string | null
    selectedUserTeamRole: string | null
    token: string
    orderType: string
    organizationName: string
    adminAccess: boolean
    readonly: boolean
    legalEnabled: boolean
    reviewEnabled: boolean
  }
  interface Session {
    user?: User
  }
}
