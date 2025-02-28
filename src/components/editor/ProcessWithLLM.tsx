import { OrderDetails } from "@/app/editor/[fileId]/page";
import { useState } from "react";
import ReactQuill from "react-quill";

interface ProcessWithLLMProps {
  transcript: string;
  processWithLLMModalOpen: boolean;
  setprocessWithLLMModalOpen: React.Dispatch<React.SetStateAction<boolean>>
  orderDetails: OrderDetails;
  quillRef: React.RefObject<ReactQuill> | undefined;
  updateQuill: (quillRef: React.RefObject<ReactQuill> | undefined, content: string) => void;
}

const ProcessWithLLM = (
  { transcript, 
    processWithLLMModalOpen, 
    setprocessWithLLMModalOpen,
    orderDetails,
    quillRef,
    updateQuill  
  }: ProcessWithLLMProps) => {
  return (
    <div className="">

    </div>
  )
}

export default ProcessWithLLM;
