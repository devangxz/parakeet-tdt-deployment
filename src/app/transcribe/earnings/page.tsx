'use client'
import { useState } from 'react'

import Earnings from './earnings'
import WithdrawalsPage from './withdrawals'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function EarningsPage() {
  const [activeTab, setActiveTab] = useState('earnings')

  return (
    <div className='h-full flex-1 flex-col p-4 md:flex space-y-3'>
      <div>
        <Tabs
          key={activeTab}
          defaultValue={activeTab}
          onValueChange={(value) => {
            setActiveTab(value)
          }}
        >
          <TabsList className='rounded-md bg-primary/5'>
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
