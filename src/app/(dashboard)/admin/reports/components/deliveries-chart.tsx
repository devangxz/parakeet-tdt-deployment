'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface DeliveriesChartProps {
  data: {
    t: [number, number][]
    d: [number, string][]
    a: { t: number }
  }
}

export function DeliveriesChart({ data }: DeliveriesChartProps) {
  const chartData = data.t.map((item, index) => ({
      date: data.d[index]?.[1] || '',
      hours: item[1] || 0,
    }))

  return (
    <div className='w-full h-[300px] mt-4'>
      <ResponsiveContainer width='100%' height='100%'>
        <BarChart
          data={chartData}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray='3 3' />
          <XAxis dataKey='date' />
          <YAxis
            label={{ value: 'Hours', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip
            formatter={(value: number) => [
              `${Number(value).toFixed(2)} hrs`,
              'Hours',
            ]}
          />
          <Legend />
          <Bar dataKey='hours' fill='#8143e5' name='Date' />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
