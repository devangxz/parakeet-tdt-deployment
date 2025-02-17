import React from 'react';

import formatDuration from '@/utils/formatDuration';

interface WaveformHeatmapProps {
  waveformUrl: string;
  listenCount: number[];
  editedSegments: Set<number>;
  duration: number;
}

export function WaveformHeatmap({
  waveformUrl,
  listenCount,
  editedSegments,
  duration
}: WaveformHeatmapProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  const getHeatmapColor = (count: number): string => {
    const colors = [
      'rgba(243, 244, 246, 0.7)', // unplayed - light gray
      'rgba(254, 249, 195, 0.7)', // yellow-50
      'rgba(253, 224, 71, 0.7)',  // yellow-300
      'rgba(251, 146, 60, 0.7)',  // orange-400
      'rgba(239, 68, 68, 0.7)',   // red-500
      'rgba(185, 28, 28, 0.7)'    // red-700
    ];
    return colors[Math.min(count, 5)];
  };

  const getOptimalInterval = (duration: number): number => {
    const hours = duration / 3600;
    
    if (hours <= 0.5) return 300;     // 5 min intervals for <= 30 mins
    if (hours <= 1) return 600;       // 10 min intervals for <= 1 hour
    if (hours <= 2) return 900;       // 15 min intervals for <= 2 hours
    if (hours <= 3) return 1800;      // 30 min intervals for <= 3 hours
    if (hours <= 6) return 3600;      // 1 hour intervals for <= 6 hours
    return 7200;                      // 2 hour intervals for > 6 hours
  };

  const generateTimeMarkers = () => {
    const interval = getOptimalInterval(duration);
    const markers = [];
    let currentTime = interval;
    
    while (currentTime < duration - interval/2) {
      const percentage = (currentTime / duration) * 100;
      markers.push({
        time: currentTime,
        position: percentage
      });
      currentTime += interval;
    }
    
    return markers;
  };

  const timeMarkers = generateTimeMarkers();

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d')!;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    context.scale(dpr, dpr);

    context.clearRect(0, 0, rect.width, rect.height);

    const segmentWidth = rect.width / duration;
    const canvasHeight = rect.height;
    const chunkSize = 100;
    let currentIndex = 0;
    let cancelled = false;

    function drawChunk() {
      if (cancelled) {
        return;
      }

      const endIndex = Math.min(currentIndex + chunkSize, duration);

      for (let i = currentIndex; i < endIndex; i++) {
        const count = listenCount[i] || 0;
        
        context.fillStyle = getHeatmapColor(count);
        context.fillRect(i * segmentWidth, 0, segmentWidth, canvasHeight);

        if (editedSegments.has(i)) {
          const cx = i * segmentWidth + segmentWidth / 2;
          const cy = canvasHeight / 2;
          const radius = 4;

          context.beginPath();
          context.arc(cx, cy, radius, 0, Math.PI * 2);
          context.fillStyle = '#10B981';
          context.fill();
        }
      }
      currentIndex = endIndex;
      
      if (currentIndex < duration) {
        setTimeout(drawChunk, 0);
      }
    }

    drawChunk();

    return () => {
      cancelled = true;
    };
  }, [duration, listenCount, editedSegments]);

  return (
    <div className="relative w-full">
      <div className="flex gap-2 mb-1 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Edited</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="flex gap-px h-2">
            {[0,1,2,3,4,5].map(count => (
              <div 
                key={count}
                className="w-2"
                style={{ backgroundColor: getHeatmapColor(count) }}
              />
            ))}
          </div>
          <span>Play count</span>
        </div>
      </div>

      <div className="w-full">
        <div 
          className="h-16 rounded-md overflow-hidden border relative w-full"
          style={{
            backgroundImage: `url(${waveformUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
        </div>
        
        <div className="relative h-6 px-1">
          <div className="absolute left-0 right-0 top-0 h-1 flex items-center">
            <div className="absolute left-0 w-0.5 h-1.5 bg-gray-300" />
            {timeMarkers.map(({ time, position }) => (
              <div 
                key={time}
                className="absolute w-0.5 h-1.5 bg-gray-300"
                style={{ left: `${position}%` }}
              />
            ))}
            <div className="absolute right-0 w-0.5 h-1.5 bg-gray-300" />
          </div>

          <div className="absolute left-0 right-0 top-2 flex justify-between text-xs text-gray-500">
            <span>{formatDuration(0)}</span>
            {timeMarkers.map(({ time }) => (
              <span 
                key={time}
                className="absolute -translate-x-1/2"
                style={{ left: `${(time / duration) * 100}%` }}
              >
                {formatDuration(time)}
              </span>
            ))}
            <span>{formatDuration(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WaveformHeatmap;
