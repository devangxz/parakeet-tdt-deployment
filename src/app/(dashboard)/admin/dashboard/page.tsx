'use client'
import { useSession } from 'next-auth/react'

import AccountAccess from './components/account-access'
import AccountSuspension from './components/account-suspension'
import AddCredits from './components/add-credits'
import AddLegalQC from './components/add-legal-qc'
import AddMiscEarnings from './components/add-misc-earnings'
import AddTestCustomer from './components/add-test-customer'
import ChangePaypalEmail from './components/change-paypal-email'
import Coupon from './components/coupon'
import CustomPlan from './components/custom-plan'
import DisableQC from './components/disable-qc'
import EnableACRReview from './components/enable-acr-review'
import EnableCustomFormattingBonus from './components/enable-custom-format-bonus'
import EnableCustomFormattingReview from './components/enable-custom-format-review'
import EnableCustomers from './components/enable-customers'
import EnablePreDelivery from './components/enable-pre-delivery'
import OrderWatch from './components/order-watch'
import TransferCredits from './components/transfer-credits'
import TransferFiles from './components/transfer-files'
import YouTubeVideoUploader from './components/youtube-video-uploader'

export default function AdminDashboard() {
  const { data: session } = useSession()
  return (
    <>
      <div className='h-full flex-1 flex-col space-y-8 p-5 md:flex bg-muted/40'>
        <h1 className='text-lg font-semibold md:text-lg'>Admin Dashboard</h1>
        <AccountAccess />
        {session?.user?.role === 'ADMIN' && (
          <>
            <AddCredits />
            <Coupon />
            <TransferFiles />
            <CustomPlan />
            <DisableQC />
            <AccountSuspension />
            <ChangePaypalEmail />
            <AddLegalQC />
            <EnableCustomFormattingReview />
            <EnablePreDelivery />
            <EnableCustomFormattingBonus />
            <EnableACRReview />
            <AddTestCustomer />
            <EnableCustomers />
            <AddMiscEarnings />
            <TransferCredits />
            <OrderWatch />
            <YouTubeVideoUploader />
          </>
        )}
      </div>
    </>
  )
}
