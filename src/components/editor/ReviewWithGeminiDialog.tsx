"use client";

import { ReloadIcon } from "@radix-ui/react-icons";
import { useTheme } from "next-themes";
import React, { useCallback, useEffect, useMemo, useState, memo } from "react";

import { Stepper } from "./Stepper";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../ui/dialog";
import { Progress } from "../ui/progress";
import { Slider } from "../ui/slider";
import { Textarea } from "../ui/textarea";
import { geminiRequestAction } from "@/app/actions/editor/review-with-gemini";
import { OrderDetails } from "@/app/editor/[fileId]/page";
import { FILE_CACHE_URL, GEMINI_PROMPT_OPTIONS } from "@/constants";
import { cn } from "@/lib/utils";
import axios from "@/utils/axios";
import { ButtonLoading, chunkTranscript, CTMType, findOptimalChunkPoints, handleSave } from "@/utils/editorUtils";
import { diff_match_patch, DIFF_DELETE, DIFF_INSERT, DIFF_EQUAL } from "@/utils/transcript/diff_match_patch";

interface ReviewWithGeminiDialogProps {
  reviewModalOpen: boolean;
  setReviewModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  orderDetails: OrderDetails
  buttonLoading: {
      report: boolean;
  };
  setButtonLoading: React.Dispatch<React.SetStateAction<ButtonLoading>>
  transcript: string
  ctms: CTMType[]
  updateQuill: (transcript: string) => void
}

interface DiffSegment {
  type: typeof DIFF_DELETE | typeof DIFF_INSERT | typeof DIFF_EQUAL;
  text: string;
}

export interface GeminiPromptOption {
  id: number;
  title: string;
  label: string;
}

interface GeminiOptionsProps {
  promptOptions: GeminiPromptOption[];
  selectedPrompts: string[];
  setSelectedPrompts: React.Dispatch<React.SetStateAction<string[]>>;
  instructions: string;
  setInstructions: React.Dispatch<React.SetStateAction<string>>;
  temperature: number;
  setTemperature: React.Dispatch<React.SetStateAction<number>>;
  disabled?: boolean;
}

export const computeDiffs = (text1: string, text2: string): DiffSegment[] => {
  const dmp = new diff_match_patch();
  const rawDiffs = dmp.diff_wordMode(text1, text2);
  return rawDiffs.map(([type, text]) => ({ 
    type, 
    text
  }));
};

function formatTimestamps(text: string): string {
  // Pass 1: Insert a newline before every timestamp that doesn't already have one.
  // Updated regex to match timestamps with 1 or 2 digits for seconds.
  const textWithNewlines = text.replace(
    /(?<!^)(?<!\n\n)(\d{1,2}:\d{2}:\d{1,2}(?:\.\d+)?)/g,
    "\n$1"
  );

  // Pass 2: Reformat each timestamp to follow h:mm:ss.ms format, ensuring seconds are two digits.
  const formatted = textWithNewlines.replace(
    /^(\d{1,2}):(\d{2}):(\d{1,2})(?:\.(\d+))?/gm,
    (_match, hour, minute, second, fraction) => {
      const normalizedHour = Number(hour).toString(); // Remove any leading zeros for hour.
      const paddedMinute = minute.padStart(2, '0');    // Ensure minute is two digits.
      const paddedSecond = second.padStart(2, '0');      // Pad seconds if necessary.
      const fractionDigit = fraction ? fraction.charAt(0) : "0"; // Exactly one decimal digit.
      return `${normalizedHour}:${paddedMinute}:${paddedSecond}.${fractionDigit}`;
    }
  );
  return formatted.trim();
}

/**
 * Accepts all pending diffs by marking them as equal.
 * For a DIFF_DELETE followed by a DIFF_INSERT, the insertion text (Gemini's suggestion)
 * is kept. Standalone diffs are simply converted to equal type.
 */
function acceptAllDiffs(diffs: DiffSegment[]): DiffSegment[] {
  const newDiffs: DiffSegment[] = [];
  let i = 0;
  while (i < diffs.length) {
    const diff = diffs[i];
    // If deletion is immediately followed by insertion, merge into Gemini text.
    if (diff.type === DIFF_DELETE && i + 1 < diffs.length && diffs[i + 1].type === DIFF_INSERT) {
      newDiffs.push({ type: DIFF_EQUAL, text: diffs[i + 1].text });
      i += 2;
    } else if (diff.type === DIFF_INSERT || diff.type === DIFF_DELETE) {
      newDiffs.push({ type: DIFF_EQUAL, text: diff.text });
      i++;
    } else {
      newDiffs.push(diff);
      i++;
    }
  }
  return newDiffs;
}

/**
 * Rejects all pending diffs by discarding Gemini's changes.
 * For a DIFF_DELETE followed by a DIFF_INSERT, the original text (the deletion content)
 * is retained. Standalone DIFF_INSERTs are dropped.
 */
function rejectAllDiffs(diffs: DiffSegment[]): DiffSegment[] {
  const newDiffs: DiffSegment[] = [];
  let i = 0;
  while (i < diffs.length) {
    const diff = diffs[i];
    if (diff.type === DIFF_DELETE && i + 1 < diffs.length && diffs[i + 1].type === DIFF_INSERT) {
      // Retain the original text from the deletion segment.
      newDiffs.push({ type: DIFF_EQUAL, text: diff.text });
      i += 2;
    } else if (diff.type === DIFF_INSERT) {
      // Drop any unpaired insertions.
      i++;
    } else if (diff.type === DIFF_DELETE) {
      newDiffs.push({ type: DIFF_EQUAL, text: diff.text });
      i++;
    } else {
      newDiffs.push(diff);
      i++;
    }
  }
  return newDiffs;
}

export function ReviewGeminiOptions({
  promptOptions,
  selectedPrompts,
  setSelectedPrompts,
  instructions,
  setInstructions,
  temperature,
  setTemperature,
  disabled,
}: GeminiOptionsProps) {

  function togglePrompt(option: string) {
    setSelectedPrompts((prev) =>
      prev.includes(option)
        ? prev.filter((prevOption) => prevOption !== option)
        : [...prev, option]
    );
  }

  return (
    <div className="pb-4 min-h-[20vh] space-y-8 transition-all duration-1000 ease-in-out">
      <div>
        <p className="text-sm font-medium">Prompt Options:</p>
        <div className="mt-2 flex flex-col gap-4">
          {promptOptions.map((option) => (
            <label key={option.id} className="inline-flex items-center space-x-2">
              <input
                type="checkbox"
                value={option.label}
                checked={selectedPrompts.includes(option.label)}
                onChange={() => togglePrompt(option.label)}
                className="h-4 w-4"
              />
              <span className="text-sm">{option.title}</span>
            </label>
          ))}
        </div>
      </div>
      <div className='flex space-x-2'>
        <p className="text-sm font-medium">Temperature :</p>
        <Slider
          value={[temperature]}
          onValueChange={(value: number[]) => setTemperature(value[0])}
          step={0.1}
          min={0}
          max={2}
          disabled={disabled}
          className="w-1/3"
        />
        <span className="text-sm">{temperature}</span>
      </div>
      <div>
        <p className="text-sm font-medium">Additional Instructions:</p>
        <Textarea
          placeholder="Enter additional instructions for Gemini to follow..."
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          className="mt-1 block w-full rounded border px-2 py-1 text-sm"
        />
      </div>
    </div>
  );
}

interface DiffSegmentItemProps {
  index: number;
  diff: DiffSegment;
  onAccept: (index: number) => void;
  onReject: (index: number) => void;
}

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

export default function ReviewTranscriptDialog({
  reviewModalOpen,
  setReviewModalOpen,
  orderDetails,
  transcript,
  ctms,
  updateQuill,
}: ReviewWithGeminiDialogProps) {
  
  const [step, setStep] = useState<'options' | 'review' | 'preview'>('options');
  const [loading, setLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("Please try again later.");
  const [finalTranscript, setFinalTranscript] = useState<string>('');
  const [diffs, setDiffs] = useState<DiffSegment[]>([]);
  const [selectedPrompts, setSelectedPrompts] = useState<string[]>([]);
  const [instructions, setInstructions] = useState<string>('');
  const [progressMessage, setProgressMessage] = useState<string>('');
  const [progressValue, setProgressValue] = useState<number>(0);
  const [temperature, setTemperature] = useState<number>(1);
  const { fileId } = orderDetails;

  // Map the step string to its corresponding index
  const stepToIndex: Record<typeof step, number> = {
    options: 0,
    review: 1,
    preview: 2,
  };
  const activeStepIndex = stepToIndex[step];

  const handleNextOptions = useCallback(async () => {
    
    setLoading(true);
    setIsError(false);
    setStep('review');
    try {
      const userPrompt = selectedPrompts.join("\n") + "\n" + instructions;
      const chunkPoints = findOptimalChunkPoints(ctms);
      let chunkKey: string | null = null;
      let geminiTranscript = '';

      const transcriptChunks = chunkTranscript(transcript, chunkPoints);
      const totalChunks = (chunkPoints.length - 1) * 2;
      let progress = 0;

      // start time
      for(let i = 0; i < chunkPoints.length - 1; i++) {
        setProgressMessage(`Initializing transcript part ${i + 1} of ${chunkPoints.length - 1}`);
        
        const createChunksAPI = await axios.post(`${FILE_CACHE_URL}/create-chunks`, {
          fileId,
          startTime: chunkPoints[i],
          endTime: chunkPoints[i + 1],
          currentChunk: i+1,
          totalChunks: chunkPoints.length - 1
        });
        progress++;
        setProgressValue(progress / totalChunks * 100);

        if (createChunksAPI.data.success) {
          chunkKey = createChunksAPI.data.trimmedFileKey;
        }
        if(!chunkKey) {
          throw new Error('Failed to create all chunks for processing.');
        }
        
        setProgressMessage(`Reviewing transcript part: ${i + 1} of ${chunkPoints.length - 1}`);
        const geminiResult = await geminiRequestAction(transcriptChunks[i], chunkKey, i, chunkPoints.length - 1, temperature, userPrompt);
        geminiTranscript += geminiResult + "\n";
        progress++;
        setProgressValue(progress / totalChunks * 100);
      }  

      // endtime
      setProgressMessage('Finalizing transcript review...');
      setProgressValue(100);
      const formattedGeminiTranscript = formatTimestamps(geminiTranscript);
      const differences = computeDiffs(transcript, formattedGeminiTranscript);
      setDiffs(differences);
    } catch (error) {
      setErrorMessage("Unable to review transcript. Please try again later.");
      console.log(error);
      setIsError(true);
    } finally {
      setLoading(false);
    }
  }, [selectedPrompts, instructions, fileId, ctms, transcript, temperature]);

  const handleAccept = useCallback((index: number) => {
    setDiffs((prevDiffs) => {
      const newDiffs = [...prevDiffs];
      const currentDiff = newDiffs[index];
      newDiffs[index] = { ...currentDiff, type: DIFF_EQUAL };
      return newDiffs;
    });
  }, []);

  const handleReject = useCallback((index: number) => {
    setDiffs((prevDiffs) => {
      const newDiffs = [...prevDiffs];
      newDiffs.splice(index, 1);
      return newDiffs;
    });
  }, []);

  /**
   * When rejecting all, we discard any Gemini insertions so that
   * the final transcript consists only of the original text.
   */
  const handleRejectAll = useCallback(() => {
    const rejectedDiffs = rejectAllDiffs(diffs);
    setDiffs(rejectedDiffs);
    const finalTranscript = rejectedDiffs.map(diff => diff.text).join('');
    setFinalTranscript(finalTranscript);
    setStep('preview');
  }, [diffs, updateQuill, setReviewModalOpen]);

  /**
   * When accepting all, we mark every actionable diff as equal so that
   * Gemini's suggestions are fully incorporated into the transcript.
   */
  const handleAcceptAll = useCallback(() => {
    const acceptedDiffs = acceptAllDiffs(diffs);
    setDiffs(acceptedDiffs);
    const finalTranscript = acceptedDiffs.map(diff => diff.text).join('');  
    setFinalTranscript(finalTranscript);
    setStep('preview');
  }, [diffs, updateQuill, setReviewModalOpen]);

  const handleSaveButton = async () => {
    updateQuill(finalTranscript);
    setReviewModalOpen(false);
    await handleSave(
      {
        getEditorText: () => finalTranscript,
        orderDetails,
        notes: '',
        cfd: '',
        setButtonLoading: () => {},
        listenCount: [],
        editedSegments: new Set()
      },
      true
    );
  };

  useEffect(() => {
    if (!reviewModalOpen) {
      setStep('options');
      setDiffs([]);
      setSelectedPrompts([]);
      setInstructions('');
      setIsError(false);
    }
    if(transcript){
      setLoading(false);
    }
  }, [reviewModalOpen, transcript]);  

  const renderedDiffs = useMemo(() => 
    diffs.map((diff, index) => (
          <DiffSegmentItem
            key={index}
            index={index}
            diff={diff}
            onAccept={handleAccept}
            onReject={handleReject}
          />
        )
      )
      .filter((element) => element !== null)
  ,[diffs, handleAccept, handleReject]);

  return (
    <Dialog open={reviewModalOpen} onOpenChange={setReviewModalOpen}>
      <DialogContent className="w-96 sm:w-full lg:max-w-4xl xl:max-w-6xl">
        <DialogHeader>
          <DialogTitle>Review with Gemini</DialogTitle>
          <DialogDescription>
            {step === 'options'
              ? "Select your prompt options and add any additional instructions below."
              : step === 'review'
              ? "Hover over the text to accept or reject the suggested changes."
              : "Review the final transcript and save your changes."}
          </DialogDescription>
        </DialogHeader>
        
        {/* Insert the stepper below the header */}
        <div className="px-4 pt-2">
          <Stepper steps={['Options', 'Review', 'Preview']} activeStep={activeStepIndex} />
        </div>
                
        {step === 'options' && (
          transcript ? (
            <ReviewGeminiOptions
              promptOptions={GEMINI_PROMPT_OPTIONS}
              selectedPrompts={selectedPrompts}
              setSelectedPrompts={setSelectedPrompts}
              instructions={instructions}
              setInstructions={setInstructions}
              temperature={temperature}
              setTemperature={setTemperature}
              disabled={loading}
            />
          ) : (
            <div className="flex space-x-2 justify-center items-center h-[60vh]">
              <ReloadIcon className="h-4 w-4 animate-spin" />
              <span>Loading</span>
            </div>
          )
        )}
        {step === 'review' && (
          <>
            {isError ? (
              <div className="flex justify-center items-center h-[60vh]">
                <span>{errorMessage}</span>
              </div>
            ) : loading ? (
              <div className="flex flex-col space-y-4 justify-center items-center h-[60vh] ">
                <Progress value={progressValue} className="w-1/3 sm:w-1/2 animate-pulse" color="primary" />
                <span>{progressMessage}</span>
              </div>
            ) : (
              <div className="p-2 px-4 overflow-y-auto h-[60vh] whitespace-pre-wrap">
                {renderedDiffs}
              </div>
            )}
          </>
        )}
        {step == 'preview' && (
          <div className="p-2 px-4 overflow-y-auto h-[60vh] whitespace-pre-wrap">
            {finalTranscript}
          </div>
        )}
        <DialogFooter className="flex gap-2">
          {step === 'options' ? (
            <>
              <Button onClick={handleNextOptions} disabled={loading}>
                {loading ? (
                  <>
                    <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
                    Next
                  </>
                ) : (
                  'Next'
                )}
              </Button>
              <Button variant="outline" onClick={() => setReviewModalOpen(false)}>
                Cancel
              </Button>
            </>
          ) : step == 'review' ? (
            <>
              <Button variant="default" onClick={handleRejectAll} disabled={loading || isError}>
                Reject All
              </Button>
              <Button variant="default" onClick={handleAcceptAll} disabled={loading || isError}>
                Accept All
              </Button>
            </>
          ) : (
            <>
              <Button variant="default" onClick={handleSaveButton} disabled={loading || isError}>
                Save
              </Button>
              <Button variant="default" onClick={() => setReviewModalOpen(false)} disabled={loading || isError}>
                Cancel
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
