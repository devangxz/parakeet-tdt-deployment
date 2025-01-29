import React from 'react';

import formatDuration from '@/utils/formatDuration';

interface PlayStats {
  listenCount: number[];
}

interface PlayStatsVisualizationProps {
  waveformUrl: string;
  playStats: PlayStats;
  editedSegments: Set<number>;
  duration: number;
}

const PlayStatsVisualization: React.FC<PlayStatsVisualizationProps> = ({
  waveformUrl,
  playStats,
  editedSegments,
  duration
}) => {
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
          <div className="absolute inset-0 flex">
            {Array.from({length: duration}).map((_, i) => (
              <div
                key={i}
                className="h-full flex-1 relative"
                style={{
                  backgroundColor: getHeatmapColor(playStats.listenCount[i] || 0)
                }}
              >
                {editedSegments.has(i) && (
                  <div 
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-emerald-500 rounded-full"
                    style={{
                      boxShadow: '0 0 2px rgba(16, 185, 129, 0.8)'
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
        
        <div className="relative h-6 px-1">
          {/* Scale markers */}
          <div className="absolute left-0 right-0 top-0 h-1 flex items-center">
            <div className="absolute left-0 w-0.5 h-1.5 bg-gray-300" />
            {timeMarkers.map(({time, position}) => (
              <div 
                key={time}
                className="absolute w-0.5 h-1.5 bg-gray-300"
                style={{ left: `${position}%` }}
              />
            ))}
            <div className="absolute right-0 w-0.5 h-1.5 bg-gray-300" />
          </div>

          {/* Time labels */}
          <div className="absolute left-0 right-0 top-2 flex justify-between text-xs text-gray-500">
            <span>{formatDuration(0)}</span>
            {timeMarkers.map(({time}) => (
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
};

export default PlayStatsVisualization;