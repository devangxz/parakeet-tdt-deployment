import { ReloadIcon } from '@radix-ui/react-icons'
import ReactQuill from 'react-quill'

import Diff from './Diff'
import Editor, { EditorHandle } from './Editor'
import { TabsContent } from './Tabs'
import { OrderDetails } from '@/app/editor/[fileId]/page'
import { EditorSettings } from '@/types/editor'
import { CTMType, CustomerQuillSelection, EditorData } from '@/utils/editorUtils'
import { DmpDiff } from '@/utils/transcript/diff_match_patch'

interface EditorTabComponentProps {
  transcriptLoading: boolean
  ctms: CTMType[]
  audioPlayer: HTMLAudioElement | null
  audioDuration: number
  getQuillRef: (quillRef: React.RefObject<ReactQuill>) => void
  orderDetails: OrderDetails
  setSelectionHandler: () => void
  selection: CustomerQuillSelection | null
  searchHighlight: CustomerQuillSelection | null
  highlightWordsEnabled: boolean
  setFontSize: (size: number) => void
  setEditedSegments: (segments: Set<number>) => void
  editorSettings: EditorSettings
  initialEditorData: EditorData
  editorRef?: React.Ref<EditorHandle>
}

export const EditorTabComponent = ({
  transcriptLoading,
  ctms,
  audioPlayer,
  audioDuration,
  getQuillRef,
  orderDetails,
  setSelectionHandler,
  selection,
  searchHighlight,
  highlightWordsEnabled,
  setFontSize,
  setEditedSegments,
  editorSettings,
  initialEditorData,
  editorRef,
}: EditorTabComponentProps) => (
  <TabsContent
    forceMount
    className='data-[state=inactive]:hidden h-full mt-0 overflow-hidden pb-[41px]'
    value='transcribe'
  >
    <div className='h-full relative overflow-hidden'>
      {transcriptLoading ? (
        <div className='h-full flex items-center justify-center'>
          <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
          <span>Loading...</span>
        </div>
      ) : (
        <div className='h-full overflow-hidden'>
          <Editor
            ref={editorRef}
            orderDetails={orderDetails}
            getQuillRef={getQuillRef}
            ctms={ctms}
            audioPlayer={audioPlayer}
            duration={audioDuration}
            setSelectionHandler={setSelectionHandler}
            selection={selection}
            searchHighlight={searchHighlight}
            highlightWordsEnabled={highlightWordsEnabled}
            setFontSize={setFontSize}
            setEditedSegments={setEditedSegments}
            editorSettings={editorSettings}
            initialEditorData={initialEditorData}
          />
        </div>
      )}
    </div>
  </TabsContent>
)

export const DiffTabComponent = ({ diff }: { diff: DmpDiff[] }) => (
  <TabsContent forceMount className='data-[state=inactive]:hidden h-full mt-0 overflow-hidden pb-[41px]' value='diff'>
    <div className='h-full overflow-y-auto py-[12px] px-[15px]'>
      <div className='h-full'>
        <Diff diffOutput={diff} />
      </div>
    </div>
  </TabsContent>
)

export const InfoTabComponent = ({
  orderDetails,
}: {
  orderDetails: OrderDetails
}) => (
  <TabsContent forceMount className='data-[state=inactive]:hidden h-full mt-0 overflow-hidden pb-[41px]' value='info'>
    <div className='h-full py-[12px] px-[15px]'>
      <div className='h-full'>
        {orderDetails.instructions || 'No customer instructions.'}
      </div>
    </div>
  </TabsContent>
)
