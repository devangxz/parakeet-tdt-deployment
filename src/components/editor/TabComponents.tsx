import { ReloadIcon } from '@radix-ui/react-icons'
import ReactQuill from 'react-quill'

import Editor from './Editor'
import { TabsContent } from './Tabs'
import { Textarea } from '../ui/textarea'
import { OrderDetails } from '@/app/editor/[fileId]/page'
import { CTMType, CustomerQuillSelection } from '@/utils/editorUtils'

interface EditorTabComponentProps {
  transcript: string
  ctms: CTMType[]
  audioPlayer: HTMLAudioElement | null
  audioDuration: number
  getQuillRef: (quillRef: React.RefObject<ReactQuill>) => void
  orderDetails: OrderDetails
  setSelectionHandler: () => void
  selection: CustomerQuillSelection | null
  searchHighlight: CustomerQuillSelection | null
  highlightWordsEnabled: boolean
  setEditedSegments: (segments: Set<number>) => void
}

export const EditorTabComponent = ({
  transcript,
  ctms,
  audioPlayer,
  audioDuration,
  getQuillRef,
  orderDetails,
  setSelectionHandler,
  selection,
  searchHighlight,
  highlightWordsEnabled,
  setEditedSegments,
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
            setSelectionHandler={setSelectionHandler}
            selection={selection}
            searchHighlight={searchHighlight}
            highlightWordsEnabled={highlightWordsEnabled}
            setEditedSegments={setEditedSegments}
          />
        </div>
      )}
    </div>
  </TabsContent>
)

export const DiffTabComponent = ({ diff }: { diff: string }) => (
  <TabsContent className='h-full mt-0 overflow-hidden' value='diff'>
    <div 
      className='overflow-y-scroll h-full py-[12px] px-[15px]'
      dangerouslySetInnerHTML={{ __html: diff.replace(/\n/g, '<br>') }}
    />
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
