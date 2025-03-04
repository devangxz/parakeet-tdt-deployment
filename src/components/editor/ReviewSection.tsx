"use client";

import React, { useMemo } from "react";

import { DiffSegmentItem } from "./DiffSegmentItem";
import { Progress } from "../ui/progress";
import { DiffSegment } from "@/utils/editorUtils";

interface ReviewSectionHelperProps {
  isError: boolean;
  errorMessage: string;
  loading: boolean;
  progressValue: number;
  progressMessage: string;
  diffs: DiffSegment[];
  onAccept: (index: number) => void;
  onReject: (index: number) => void;
}

export function ReviewSectionHelper({
  isError,
  errorMessage,
  loading,
  progressValue,
  progressMessage,
  diffs,
  onAccept,
  onReject,
}: ReviewSectionHelperProps) {
  const renderedDiffs = useMemo(
    () =>
      diffs
        .map((diff, index) => (
          <DiffSegmentItem
            key={index}
            index={index}
            diff={diff}
            onAccept={onAccept}
            onReject={onReject}
          />
        ))
        .filter((element) => element !== null),
    [diffs, onAccept, onReject]
  );

  if (isError) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <span>{errorMessage}</span>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col space-y-4 justify-center items-center h-[60vh]">
        <Progress value={progressValue} className="w-1/3 sm:w-1/2 animate-pulse" color="primary" />
        <span>{progressMessage}</span>
      </div>
    );
  }

  return (
    <div className="p-2 px-4 overflow-y-auto h-[60vh] whitespace-pre-wrap">
      {renderedDiffs}
    </div>
  );
} 