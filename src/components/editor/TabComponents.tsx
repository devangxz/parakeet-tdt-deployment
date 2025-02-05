import { ReloadIcon } from '@radix-ui/react-icons'
import { Change } from 'diff'
import { Op } from 'quill/core'
import ReactQuill from 'react-quill'

import Diff from './Diff'
import Editor from './Editor'
import { TabsContent } from './Tabs'
import { Textarea } from '../ui/textarea'
import { OrderDetails } from '@/app/editor/[fileId]/page'
import { EditorSettings } from '@/types/editor'
import { CTMType, CustomerQuillSelection } from '@/utils/editorUtils'

interface EditorTabComponentProps {
  transcript: string
  ctms: CTMType[]
  audioPlayer: HTMLAudioElement | null
  audioDuration: number
  getQuillRef: (quillRef: React.RefObject<ReactQuill>) => void
  orderDetails: OrderDetails
  content: Op[]
  setContent: (content: Op[]) => void
  setSelectionHandler: () => void
  selection: CustomerQuillSelection | null
  searchHighlight: CustomerQuillSelection | null
  highlightWordsEnabled: boolean
  setFontSize: (size: number) => void
  setEditedSegments: (segments: Set<number>) => void
  editorSettings: EditorSettings
  isWordPlayback: React.MutableRefObject<boolean>
}

export const EditorTabComponent = ({
  transcript,
  ctms,
  audioPlayer,
  audioDuration,
  getQuillRef,
  orderDetails,
  content,
  setContent,
  setSelectionHandler,
  selection,
  searchHighlight,
  highlightWordsEnabled,
  setFontSize,
  setEditedSegments,
  editorSettings,
  isWordPlayback,
}: EditorTabComponentProps) => (
  <TabsContent
    className='h-full mt-0 overflow-hidden pb-[41px]'
    value='transcribe'
  >
    <div className='h-full relative overflow-hidden'>
      {!transcript && (
        <div className='h-full flex items-center justify-center'>
          <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
          <span>Loading...</span>
        </div>
      )}
      {transcript && (
        <div className='h-full overflow-hidden'>
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
            highlightWordsEnabled={highlightWordsEnabled}
            setFontSize={setFontSize}
            setEditedSegments={setEditedSegments}
            editorSettings={editorSettings}
            isWordPlayback={isWordPlayback}
          />
        </div>
      )}
    </div>
  </TabsContent>
)

export const DiffTabComponent = ({ diff }: { diff: Change[] }) => (
  <TabsContent className='h-full mt-0 overflow-hidden' value='diff'>
    <div className='overflow-y-scroll h-full py-[12px] px-[15px]'>
      <Diff diffOutput={diff} />
    </div>
  </TabsContent>
)

export const InfoTabComponent = ({
  orderDetails,
}: {
  orderDetails: OrderDetails
}) => (
  <TabsContent className='h-full mt-0 overflow-hidden' value='info'>
    <div className='h-full py-[12px] px-[15px]'>
      <Textarea
        placeholder='Customer instructions'
        className='h-full resize-none border-0 px-0 py-0 focus-visible:ring-0'
        value={orderDetails.instructions}
        readOnly
      />
    </div>
  </TabsContent>
)
