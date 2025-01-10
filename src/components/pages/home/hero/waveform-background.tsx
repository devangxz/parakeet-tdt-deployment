'use client'

import { useEffect, useRef } from 'react'

export default function WaveformBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const setCanvasSize = () => {
      canvas.width = window.innerWidth
      canvas.height = 400
    }
    setCanvasSize()
    window.addEventListener('resize', setCanvasSize)

    const bars = 200
    const barWidth = canvas.width / bars
    
    ctx.fillStyle = 'rgba(100, 66, 237, 0.15)' // Reduced opacity

    for (let i = 0; i < bars; i++) {
      const height = (
        Math.random() * 40 + 
        Math.random() * 60 + 
        Math.random() * 30
      ) 
      
      const x = i * barWidth
      const centerY = canvas.height / 2
      
      ctx.fillRect(
        x, 
        centerY - (height / 2),
        barWidth - 1,
        height
      )
    }

    return () => {
      window.removeEventListener('resize', setCanvasSize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute bottom-0 left-0 w-full pointer-events-none opacity-50"
      style={{ height: '400px' }}
    />
  )
}