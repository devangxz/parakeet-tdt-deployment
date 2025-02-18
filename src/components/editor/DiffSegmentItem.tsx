import { useTheme } from "next-themes";
import React, { memo } from "react";

import { cn } from "@/lib/utils";
import { DiffSegment } from "@/utils/editorUtils";
import { diff_match_patch, DIFF_DELETE, DIFF_INSERT } from "@/utils/transcript/diff_match_patch";

interface DiffSegmentItemProps {
  index: number;
  diff: DiffSegment;
  onAccept: (index: number) => void;
  onReject: (index: number) => void;
}

export const computeDiffs = (text1: string, text2: string): DiffSegment[] => {
  const dmp = new diff_match_patch();
  const rawDiffs = dmp.diff_wordMode(text1, text2);
  return rawDiffs.map(([type, text]) => ({ 
    type, 
    text
  }));
};

export const DiffSegmentItem: React.FC<DiffSegmentItemProps> = memo(function DiffSegmentItem({
  index,
  diff,
  onAccept,
  onReject,
}) {
  const { theme } = useTheme();
  const isActionable = diff.type === DIFF_INSERT || diff.type === DIFF_DELETE;
  const bgColor =
    diff.type === DIFF_INSERT ? 
      theme === 'dark' ? 'bg-green-900' : 'bg-green-200'
      : diff.type === DIFF_DELETE
      ? theme === 'dark' ? 'bg-red-900' : 'bg-red-200'
      : '';

  return (
    <span className={cn('relative inline group', isActionable ? bgColor : '')}>
      <span className={isActionable ? 'cursor-pointer group relative' : 'cursor-default'}>
        {diff.text}
      </span>
      {isActionable && (
        <div
          className="absolute -top-2 left-0 space-x-0 hidden group-hover:flex transition-opacity z-[50] max-w-full"
          style={{ maxWidth: 'calc(100% - 1rem)' }}
        >
          <button
            className="bg-green-500 text-white text-xs px-1 rounded"
            onClick={(e) => {
              e.stopPropagation();
              onAccept(index);
            }}
          >
            Accept
          </button>
          <button
            className="bg-red-500 text-white text-xs px-1 rounded"
            onClick={(e) => {
              e.stopPropagation();
              onReject(index);
            }}
          >
            Reject
          </button>
        </div>
      )}
    </span>
  );
});
