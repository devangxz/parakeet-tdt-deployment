import NextAuth from 'next-auth/next'
import CredentialsProvider from 'next-auth/providers/credentials'

import { NEXT_AUTH_SESSION_MAX_AGE, BACKEND_URL } from '@/constants'

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'Credentials',

      credentials: {
        email: {
          label: 'Username',
          type: 'text',
        },
        password: { label: 'Password', type: 'password' },
      },

      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        try {
          const res = await fetch(`${BACKEND_URL}/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          })

          const user = await res.json()

          if (res.ok && user.token) {
            return { ...user.user, email: credentials.email, token: user.token }
          }

          // Return null if user data could not be retrieved
          return null
        } catch (e) {
          console.error(e)
          return null
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: NEXT_AUTH_SESSION_MAX_AGE,
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (trigger === 'update') {
        return { ...token, ...session.user }
      }
      return { ...token, ...user }
    },
    async session({ session, token }) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      session.user = token as any
      return session
    },
  },
  pages: {
    signIn: '/signin',
  },
})

export { handler as GET, handler as POST }
