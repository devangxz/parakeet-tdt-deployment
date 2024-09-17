import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Credits',
  description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
}

interface PaymentsLayoutProps {
  children: React.ReactNode
}

export default function PaymentsLayout({ children }: PaymentsLayoutProps) {
  return children
}
