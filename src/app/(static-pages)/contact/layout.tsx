import Footer from '@/components/footer'
import Navbar from '@/components/navbar'

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <section>
      <Navbar />
      {children}
      <Footer />
    </section>
  )
}
