import ReactQuill from "react-quill";

import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { OrderDetails } from "@/app/editor/[fileId]/page";

interface ProcessWithLLMProps {
  transcript: string;
  processWithLLMModalOpen: boolean;
  setprocessWithLLMModalOpen: React.Dispatch<React.SetStateAction<boolean>>
  orderDetails: OrderDetails;
  quillRef: React.RefObject<ReactQuill> | undefined;
  updateQuill: (quillRef: React.RefObject<ReactQuill> | undefined, content: string) => void;
}

function ProcessWithLLM (
  { transcript, 
    processWithLLMModalOpen, 
    setprocessWithLLMModalOpen,
    orderDetails,
    quillRef,
    updateQuill  
  }: ProcessWithLLMProps) {
  console.log(transcript.length, orderDetails, quillRef, updateQuill)
  return (
    <div className="">
      <Dialog open={processWithLLMModalOpen} onOpenChange={setprocessWithLLMModalOpen}>
      <DialogContent className="w-96 sm:w-full lg:max-w-4xl xl:max-w-6xl">
        <DialogHeader>
          <DialogTitle>Process with LLM</DialogTitle>
        </DialogHeader>
        <DialogFooter className="flex gap-2">
          <>
            <Button variant="outline" onClick={() => setprocessWithLLMModalOpen(false)}>
              Cancel
            </Button>
          </>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </div>
  )
}

export default ProcessWithLLM;
