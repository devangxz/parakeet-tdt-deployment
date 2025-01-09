import { ReloadIcon } from "@radix-ui/react-icons";
import { Change } from "diff";
import { Op } from "quill/core";
import ReactQuill from "react-quill";

import Diff from './Diff';
import Editor from "./Editor";
import { TabsContent } from "./Tabs";
import { Textarea } from "../ui/textarea";
import { OrderDetails } from "@/app/editor/[fileId]/page";
import { LineData } from "@/components/editor/transcriptUtils";
import { CTMType, CustomerQuillSelection } from "@/utils/editorUtils";

interface EditorTabComponentProps {
    transcript: string
    ctms: CTMType[]
    audioPlayer: HTMLAudioElement | null
    audioDuration: number
    getQuillRef: (quillRef: React.RefObject<ReactQuill>) => void
    orderDetails: OrderDetails
    content: Op[]
    setContent: (content: Op[]) => void
    getLines: (lineData: LineData[]) => void
    setSelectionHandler: () => void
    selection: CustomerQuillSelection | null
    searchHighlight: CustomerQuillSelection | null
}

export const EditorTabComponent = ({ transcript, ctms, audioPlayer, audioDuration, getQuillRef, orderDetails, content, setContent, setSelectionHandler, selection, searchHighlight }: EditorTabComponentProps) => (
    <TabsContent className='h-full mt-0 overflow-hidden' value='transcribe'>
        <div className='bg-white border border-gray-200 border-t-0 rounded-b-lg px-1 py-2 h-[99%] relative overflow-hidden'>
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
                        getQuillRef={getQuillRef}
                        transcript={transcript}
                        ctms={ctms}
                        audioPlayer={audioPlayer}
                        duration={audioDuration}
                        content={content}
                        setContent={setContent}
                        setSelectionHandler={setSelectionHandler}
                        selection={selection}
                        searchHighlight={searchHighlight}
                    />
                </div>
            )}
        </div>
    </TabsContent>
)

export const DiffTabComponent = ({ diff }: { diff: Change[] }) => (
    <TabsContent className='h-full mt-0' value='diff'>
        <div className='bg-white border border-gray-200 border-t-0 rounded-b-lg px-5 py-5 overflow-y-scroll h-[99%] no-scrollbar'>
            <Diff diffOutput={diff} />
        </div>
    </TabsContent>
)

export const InfoTabComponent = ({ orderDetails }: { orderDetails: OrderDetails }) => (
    <TabsContent className='h-full mt-0' value='info'>
        <div className='bg-white border border-gray-200 border-t-0 rounded-b-lg px-5 py-5 overflow-y-scroll h-[99%] no-scrollbar'>
            <Textarea
                placeholder='Customer instructions'
                className='h-full resize-none'
                value={orderDetails.instructions}
                readOnly
            />
        </div>
    </TabsContent>
)