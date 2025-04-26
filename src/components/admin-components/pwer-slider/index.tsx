'use client'

import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'

const markers = [
  { position: 0, label: '0', description: 'Low' },
  { position: 10, label: '0.1', description: 'Medium' },
  { position: 20, label: '0.2', description: 'High' },
]

interface PwerSliderProps {
  value: number
  onChange: (value: number) => void
}

export default function PwerSlider({ value, onChange }: PwerSliderProps) {

  const handleSliderChange = (values: number[]) => {
    onChange(parseFloat(values[0].toFixed(2)))
  }

  return (
    <div className='grid gap-4 py-2'>
      <div className='grid gap-1'>
        <div className='flex items-center gap-2 mb-2'>
          <Label htmlFor='pwer-slider'>PWER Value:</Label>
          <span>{value.toFixed(2)}</span>
        </div>
        <Slider
          id='pwer-slider'
          min={0}
          max={1}
          step={0.01}
          value={[value]}
          onValueChange={handleSliderChange}
          className='mb-2 cursor-pointer'
        />
        <div className='relative h-8'>
          {markers.map(({ position, label, description }) => (
            <div key={position}>
              <div
                className='absolute h-2 w-px bg-gray-500 dark:bg-gray-400'
                style={{ left: `${position}%`, top: 0 }}
              />
              <div
                className='absolute text-xs text-gray-700 dark:text-gray-300'
                style={{
                  left: position === 100 ? 'auto' : `${position}%`,
                  right: position === 100 ? 0 : 'auto',
                  top: '0.6rem',
                }}
              >
                {label}
              </div>
              {description && (
                <div
                  className='absolute text-xs text-primary dark:text-primary'
                  style={{ left: `${position}%`, top: '1.75rem' }}
                >
                  {description}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
