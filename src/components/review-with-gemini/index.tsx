"use client";

import { ReloadIcon } from "@radix-ui/react-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import ReactQuill from "react-quill";

import { computeDiffs, DiffSegmentItem } from "../editor/DiffSegmentItem";
import { ReviewGeminiOptions } from "../editor/ReviewGeminiOptions";
import { Stepper } from "../editor/Stepper";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../ui/dialog";
import { Progress } from "../ui/progress";
import { geminiRequestAction } from "@/app/actions/editor/review-with-gemini";
import { OrderDetails } from "@/app/editor/[fileId]/page";
import { FILE_CACHE_URL, GEMINI_PROMPT_OPTIONS } from "@/constants";
import axios from "@/utils/axios";
import { ButtonLoading, chunkTranscript, CTMType, findOptimalChunkPoints, handleSave, DiffSegment, formatTimestamps, acceptAllDiffs, rejectAllDiffs } from "@/utils/editorUtils";
import { DIFF_EQUAL } from "@/utils/transcript/diff_match_patch";

interface ReviewWithGeminiDialogProps {
  quillRef: React.RefObject<ReactQuill> | undefined
  reviewModalOpen: boolean;
  setReviewModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  orderDetails: OrderDetails
  buttonLoading: {
      report: boolean;
  };
  setButtonLoading: React.Dispatch<React.SetStateAction<ButtonLoading>>
  transcript: string
  ctms: CTMType[]
  updateQuill: (quillRef: React.RefObject<ReactQuill> | undefined, content: string,) => void
}

export default function ReviewTranscriptDialog({
  quillRef,
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
  const [progressMessage, setProgressMessage] = useState<string>('Loading');
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
      console.log("error in handleNextOptions", error)
      setErrorMessage("Unable to review transcript. Please try again later.");
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
    setReviewModalOpen(false);
    // Ensure the final transcript ends with a newline to prevent clipping.
    const safeTranscript = finalTranscript.endsWith('\n')
      ? finalTranscript
      : finalTranscript + '\n';
    updateQuill(quillRef, safeTranscript);
    await handleSave(
      {
        getEditorText: () => safeTranscript,
        orderDetails,
        notes: '',
        cfd: '',
        setButtonLoading: () => {},
        listenCount: [],
        editedSegments: new Set(),
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