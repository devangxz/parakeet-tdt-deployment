import axios from 'axios'
import { getSession } from 'next-auth/react'

import { BACKEND_URL } from '@/constants'

const axiosInstance = axios.create({
  baseURL: BACKEND_URL,
})

axiosInstance.interceptors.request.use(
  async (config) => {
    const session = await getSession()
    if (session && session.user && session.user.token) {
      config.headers['Authorization'] = `Bearer ${session.user.token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

export default axiosInstance
