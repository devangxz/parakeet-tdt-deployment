"use client"
import { ReloadIcon } from "@radix-ui/react-icons";
import { InfoIcon } from "lucide-react";
import { useCallback, useEffect, useState, memo, useMemo } from "react";
import ReactQuill from "react-quill";

import { computeDiffs } from "./DiffSegmentItem";
import { ReviewSectionHelper } from "./ReviewSection";
import { Stepper } from "./Stepper";
import config from '../../../config.json';
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Progress } from "../ui/progress";
import { Textarea } from "../ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { markTranscriptWithLLMServerAction, saveProcessWithLLMStats } from "@/app/actions/editor/process-with-llm";
import { OrderDetails } from "@/app/editor/[fileId]/page";
import breakTranscript from "@/utils/breakTranscript";
import { acceptAllDiffs, DiffSegment, handleSave, rejectAllDiffs } from "@/utils/editorUtils";
import { userPrompt } from "@/utils/processWithLLMUtils";
import { DIFF_EQUAL } from "@/utils/transcript/diff_match_patch";
import { removeTimestamps } from "@/utils/transcriptUtils";

interface ProcessWithLLMProps {
  transcript: string;
  processWithLLMModalOpen: boolean;
  setprocessWithLLMModalOpen: React.Dispatch<React.SetStateAction<boolean>>
  orderDetails: OrderDetails;
  quillRef: React.RefObject<ReactQuill> | undefined;
  updateQuill: (quillRef: React.RefObject<ReactQuill> | undefined, content: string) => void;
}

export default memo(function ProcessWithLLMDialog (
  { transcript, 
    processWithLLMModalOpen, 
    setprocessWithLLMModalOpen,
    orderDetails,
    quillRef,
    updateQuill  
  }: ProcessWithLLMProps) {
 
  const [isLoading, setIsLoading] = useState(false)
  const [isError, setIsError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('');
  const [currentStage,setCurrentStage] = useState<'Instructions' | 'Marking' | 'Review' | 'Preview'>('Instructions');
  const [progressValue, setProgressValue] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [diffs, setDiffs] = useState<DiffSegment[]>([]);
  const [markedTranscript, setMarkedTranscript] = useState('');
  const [instructions, setInstructions] = useState('');
  const [llmTimeTaken, setLLMTimeTaken] = useState(0);
  const stepToIndex = useMemo(() => ({
    Instructions: 0,
    Marking: 1,
    Review: 2,
    Preview: 3
  }), []);

  const activeStepIndex = stepToIndex[currentStage];

  const handleProcessing = useCallback(async () => {
    try{
      setIsLoading(true);
      setProgressMessage('Processing transcript with LLM');
      const transcriptWithoutTimestamps = removeTimestamps(transcript);
      const transcriptParts = breakTranscript(transcriptWithoutTimestamps, config.transcript_part_length)
      const startTime = Date.now();
      let transcriptFromLLM = '';

      for(let i = 0; i < transcriptParts.length; i++) {
        setProgressMessage(`Marking transcript part ${i + 1} of ${transcriptParts.length}`);
        const markedPart = await markTranscriptWithLLMServerAction(transcriptParts[i], orderDetails.fileId, i, transcriptParts.length, instructions);
        setProgressValue((i+1)/transcriptParts.length * 100);
        transcriptFromLLM += markedPart;
      }

      transcriptFromLLM = "[--PROCEEDINGS--]\n\n" + transcriptFromLLM.replaceAll('. ', '.  ').replaceAll('? ', '? ').replaceAll(': ', ': '); //using a regex here removes the line breaks
      const endTime = Date.now();
      const timeTaken = (endTime - startTime)/1000;
      setLLMTimeTaken(timeTaken);
      setProgressValue(100);
      setCurrentStage('Review');
      const differences = computeDiffs(transcriptWithoutTimestamps,  transcriptFromLLM);
      setDiffs(differences);
    }
    catch(error){
      setIsError(true);
      setErrorMessage(`Error marking transcript with LLM: ${error}`);
    }
    finally{
      setIsLoading(false);
    }
  },[transcript, orderDetails.fileId, instructions])

  const handleAccept = useCallback((index:number) => {
    setDiffs((prevDiff) => {
      const newDiffs = [...prevDiff];
      const currentDiff = newDiffs[index];
      newDiffs[index] = {...currentDiff, type: DIFF_EQUAL};
      return newDiffs;
    })
  },[])

  const handleReject = useCallback((index:number) => {
    setDiffs((prevDiff) => {
      const newDiffs = [...prevDiff];
      newDiffs.splice(index, 1);
      return newDiffs;
    })
  },[])

  const handleRejectAll = useCallback(() => {
    const rejectedDiffs = rejectAllDiffs(diffs);
    setDiffs(rejectedDiffs);
    const finalTranscript = rejectedDiffs.map(diff => diff.text).join('');
    setMarkedTranscript(finalTranscript);
    setCurrentStage('Preview');
  }, [diffs]);

  const handleAcceptAll = useCallback(() => {
    const acceptedDiffs = acceptAllDiffs(diffs);
    setDiffs(acceptedDiffs);
    const finalTranscript = acceptedDiffs.map(diff => diff.text).join('');  
    setMarkedTranscript(finalTranscript);
    setCurrentStage('Preview');
  }, [diffs]);

  const handleSaveButton = useCallback(async() => {
    updateQuill(quillRef, markedTranscript);
    setprocessWithLLMModalOpen(false);
    await new Promise((resolve) => setTimeout(() => resolve(null), 1000)) // sleeping for 1 second to ensure the quill is updated
    
    await saveProcessWithLLMStats({
      userId: Number(orderDetails.userId),
      fileId: orderDetails.fileId,
      instructions: instructions,
      llmTimeTaken: llmTimeTaken,
      savedTime: new Date()
    })
    await handleSave(
      {
        orderDetails,
        notes: '',
        cfd: '',
        setButtonLoading: () => {},
        listenCount: [],
        editedSegments: new Set(),
        getEditorText: () => markedTranscript,
        isCF: true
      },
      true
    )
  }, [markedTranscript, orderDetails, instructions, llmTimeTaken])

  useEffect(() => {
    if(processWithLLMModalOpen) {
      setCurrentStage('Instructions');
      setIsLoading(true);
      setProgressValue(0);
      setProgressMessage('Processing transcript with LLM');
    }

    if(transcript !== '') {
      setIsLoading(false);
    }
  },[processWithLLMModalOpen, transcript])

  const handleNextButton = useCallback(async () => {
      setCurrentStage('Marking');
      await handleProcessing();
  },[handleProcessing])

  return (
    <Dialog open={processWithLLMModalOpen} onOpenChange={setprocessWithLLMModalOpen}>
      <DialogContent className="w-96 sm:w-full lg:max-w-5xl xl:max-w-6xl">
        <DialogHeader>
          <DialogTitle>Marking with LLM</DialogTitle>
          <DialogDescription>
            {
              currentStage === 'Instructions' ? 'Enter instructions for the LLM' :
              currentStage === 'Marking' ? 'Marking transcript with LLM...' :
              currentStage === 'Review' ? 'Hover over the text to accept and reject changes' :
              'Preview transcript before saving'
            }
          </DialogDescription>
        </DialogHeader>
        <div className="px-4 pt-2">
          <Stepper steps={['Instructions', 'Marking', 'Review', 'Preview']} activeStep={activeStepIndex} />
        </div>

          { currentStage === 'Instructions' && (
            !isLoading ? (
            <div className="pb-4 min-h-[20vh] space-y-8 w-full ">
              <div className="flex flex-col space-y-2 w-full">
                <div className="flex items-center space-x-2">
                <p className="text-sm font-medium">User Prompt</p>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <InfoIcon className="w-5 h-5 text-gray-500 cursor-pointer" />
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>Current User Prompt used by LLM</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Textarea 
                  className="w-full min-h-[40vh] overflow-y-auto resize-none" 
                  value={userPrompt}
                  readOnly
                />
              </div>
              <div className="flex flex-col space-y-2 w-full">
              <p className="text-sm font-medium"> Additional Instructions </p>
                <Textarea 
                  className="w-full resize-none" 
                  placeholder="Enter instructions for the LLM" 
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                />
              </div>
            </div>) 
            : (<div className="flex space-x-2 justify-center items-center h-[60vh]">
              <ReloadIcon className="h-4 w-4 animate-spin" />
              <span>Loading</span>
            </div>)
          )}

          { currentStage === 'Marking' && (
            <div className="flex flex-col space-y-2 justify-center items-center h-[60vh]">
              <Progress value={progressValue} className="w-1/3 sm:w-1/2 animate-pulse" color="primary" />
              <span>{progressMessage}</span>
            </div>
          )}
            
          {currentStage === 'Review' && (
            <div className="flex space-x-2 justify-center items-center h-[60vh]">
              <ReviewSectionHelper
                isError={isError}
                errorMessage={errorMessage}
                loading={isLoading}
                progressValue={progressValue}
                progressMessage={progressMessage}
                diffs={diffs}
                onAccept={handleAccept}
                onReject={handleReject}
              />
            </div>)}
            { currentStage === 'Preview' && (
            <div className="p-2 px-4 overflow-y-auto h-[60vh] whitespace-pre-wrap">
              {markedTranscript}
            </div>
          )}
        
        <DialogFooter className="flex gap-2">
          {currentStage === 'Instructions' && (
            <>
              <Button variant="outline" onClick={() => setprocessWithLLMModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="default" onClick={handleNextButton} disabled={isLoading || isError}>
                Next
              </Button>
            </>
          )}
          {currentStage === 'Marking' && (
              <Button variant="outline" onClick={() => setprocessWithLLMModalOpen(false)}>
                Cancel
              </Button>
            ) }
            
            {currentStage === 'Review' && (
              <>
                <Button variant="outline" onClick={() => setprocessWithLLMModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="default" onClick={handleRejectAll} disabled={isLoading || isError}>
                  Reject All
                </Button>
                <Button variant="default" onClick={handleAcceptAll} disabled={isLoading || isError}>
                  Accept All
                </Button>
              </>
            )} 
            
            {currentStage === 'Preview' && (
              <>
                <Button variant="outline" onClick={() => setprocessWithLLMModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="default" onClick={handleSaveButton} disabled={isLoading || isError}>
                  Save
                </Button>
              </>
            )
          }
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
})