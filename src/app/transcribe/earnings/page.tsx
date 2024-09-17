'use client'
import { useState } from 'react'

import Earnings from './earnings'
import WithdrawalsPage from './withdrawals'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function EarningsPage() {
  const [activeTab, setActiveTab] = useState('earnings')

  return (
    <div className='bg-[#F7F5FF] h-screen'>
      <div className='mt-8 ml-8 w-4/5'>
        <Tabs
          key={activeTab}
          defaultValue={activeTab}
          onValueChange={(value) => {
            setActiveTab(value)
          }}
        >
          <TabsList>
            <TabsTrigger value='earnings'>Earnings</TabsTrigger>
            <TabsTrigger value='withdrawals'>Withdrawals</TabsTrigger>
          </TabsList>
          <TabsContent value='earnings'>
            <Earnings />
          </TabsContent>
          <TabsContent value='withdrawals'>
            <WithdrawalsPage />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
