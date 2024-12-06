import { ReloadIcon } from "@radix-ui/react-icons";
import { Change } from "diff";
import ReactQuill from "react-quill";

import Diff from './Diff';
import Editor from "./Editor";
import { TabsContent } from "./Tabs";
import { Textarea } from "../ui/textarea";
import { OrderDetails } from "@/app/editor/[fileId]/page";
import { LineData } from "@/components/editor/transcriptUtils";
import { ConvertedASROutput } from "@/utils/editorUtils";

interface EditorTabComponentProps {
    transcript: string
    ctms: ConvertedASROutput[]
    audioPlayer: HTMLAudioElement | null
    audioDuration: number
    getQuillRef: (quillRef: React.RefObject<ReactQuill>) => void
    disableGoToWord: boolean
    orderDetails: OrderDetails
    content: { insert: string }[]
    setContent: (content: { insert: string }[]) => void
    getLines: (lineData: LineData[]) => void
}

export const EditorTabComponent = ({ transcript, ctms, audioPlayer, audioDuration, getQuillRef, disableGoToWord, orderDetails, content, setContent, getLines }: EditorTabComponentProps) => (
    <TabsContent className='h-full mt-0 overflow-hidden' value='transcribe'>
        <div className='bg-white border border-gray-200 border-t-0 rounded-b-2xl px-5 py-5 h-[99%] relative overflow-hidden'>
            {!transcript && (
                <div className="flex items-center justify-center h-[99%]">
                    <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
                    <span>Loading...</span>
                </div>
            )}
            {transcript && (
                <div className="h-full overflow-hidden">
                    <Editor
                        orderDetails={orderDetails}
                        disableGoToWord={disableGoToWord}
                        getQuillRef={getQuillRef}
                        transcript={transcript}
                        ctms={ctms}
                        audioPlayer={audioPlayer}
                        duration={audioDuration}
                        content={content}
                        setContent={setContent}
                        getLines={getLines}
                    />
                </div>
            )}
        </div>
    </TabsContent>
)

export const DiffTabComponent = ({ diff }: { diff: Change[] }) => (
    <TabsContent className='h-full mt-0' value='diff'>
        <div className='bg-white border border-gray-200 border-t-0 rounded-b-2xl px-5 py-5 overflow-y-scroll h-[99%] no-scrollbar'>
            <Diff diffOutput={diff} />
        </div>
    </TabsContent>
)

export const InfoTabComponent = ({ orderDetails }: { orderDetails: OrderDetails }) => (
    <TabsContent className='h-full mt-0' value='info'>
        <div className='bg-white border border-gray-200 border-t-0 rounded-b-2xl px-5 py-5 overflow-y-scroll h-[99%] no-scrollbar'>
            <Textarea
                placeholder='Customer instructions'
                className='h-full resize-none'
                value={orderDetails.instructions}
                readOnly
            />
        </div>
    </TabsContent>
)