import {
  ClockIcon,
  MagnifyingGlassIcon,
  Pencil1Icon,
  Pencil2Icon,
  PersonIcon,
  SpaceEvenlyVerticallyIcon,
  TextAlignLeftIcon,
  ThickArrowLeftIcon,
  ThickArrowRightIcon,
  TimerIcon,
  ZoomInIcon,
  ZoomOutIcon,
  LightningBoltIcon,
} from '@radix-ui/react-icons'
import { BinaryIcon, TimerOff, Undo2, Redo2 } from 'lucide-react'

import PlayerButton from './PlayerButton'
import { Button } from '../ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog'
import { Input } from '../ui/input'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip'
import { OrderDetails } from '@/components/editor/EditorPage'

interface ToolbarProps {
  orderDetails: OrderDetails
  setSelectionHandler: () => void
  playNextBlankInstance: () => void
  playPreviousBlankInstance: () => void
  playCurrentParagraphInstance: () => void
  insertTimestampBlankAtCursorPositionInstance: () => void
  toggleFindAndReplace: () => void
  markSection: () => void
  markExaminee: () => void
  insertSwearInLine: () => void
  adjustTimestampsBy: string
  setAdjustTimestampsBy: (adjustTimestampsBy: string) => void
  handleAdjustTimestamps: () => void
  increaseFontSize: () => void
  decreaseFontSize: () => void
  insertInterpreterSwearInLine: () => void
  highlightWordsEnabled: boolean
  setHighlightWordsEnabled: (enabled: boolean) => void
  step: string
  removeTimestamps: () => void
  toggleHighlightNumerics: () => void
  handleUndo: () => void
  handleRedo: () => void
  editorReadOnly: boolean
}

export default function Toolbar({
  orderDetails,
  setSelectionHandler,
  playNextBlankInstance,
  playPreviousBlankInstance,
  playCurrentParagraphInstance,
  insertTimestampBlankAtCursorPositionInstance,
  toggleFindAndReplace,
  markSection,
  markExaminee,
  insertSwearInLine,
  adjustTimestampsBy,
  setAdjustTimestampsBy,
  handleAdjustTimestamps,
  increaseFontSize,
  decreaseFontSize,
  insertInterpreterSwearInLine,
  highlightWordsEnabled,
  setHighlightWordsEnabled,
  step,
  removeTimestamps,
  toggleHighlightNumerics,
  handleUndo,
  handleRedo,
  editorReadOnly,
}: ToolbarProps) {
  return (
    <TooltipProvider>
       <Tooltip>
        <TooltipTrigger>
          <PlayerButton
            icon={<Undo2 className='w-4 h-4' />}
            onClick={handleUndo}
            tooltip='Undo'
            disabled={editorReadOnly}
          />
        </TooltipTrigger>
        <TooltipContent>
          <p>Undo (Ctrl+Z)</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger>
          <PlayerButton
            icon={<Redo2 className='w-4 h-4' />}
            onClick={handleRedo}
            tooltip='Redo'
            disabled={editorReadOnly}
          />
        </TooltipTrigger>
        <TooltipContent>
          <p>Redo (Ctrl+Y)</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger>
          <PlayerButton
            icon={<ThickArrowRightIcon className='w-4 h-4' />}
            onClick={playNextBlankInstance}
            tooltip='Play next blank'
            disabled={editorReadOnly}
          />
        </TooltipTrigger>
        <TooltipContent>
          <p>Play next blank (Ctrl+B)</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger>
          <PlayerButton
            icon={<ThickArrowLeftIcon className='w-4 h-4' />}
            onClick={playPreviousBlankInstance}
            tooltip='Play previous blank'
            disabled={editorReadOnly}
          />
        </TooltipTrigger>
        <TooltipContent>
          <p>Play previous blank (Ctrl+Shift+B)</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger>
          <PlayerButton
            icon={<TextAlignLeftIcon className='w-4 h-4' />}
            tooltip='Play audio from the start of current paragraph'
            onClick={playCurrentParagraphInstance}
            disabled={editorReadOnly}
          />
        </TooltipTrigger>
        <TooltipContent>
          <p>Play audio from the start of current paragraph (Ctrl+N)</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger>
          <Dialog>
            <DialogTrigger asChild>
              <PlayerButton
                icon={<TimerIcon className='w-4 h-4' />}
                onClick={setSelectionHandler}
                tooltip='Adjust timestamps'
                disabled={editorReadOnly}
              />
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adjust Timestamps</DialogTitle>
                <DialogDescription>
                  Please enter the seconds to adjust the timetamps by
                </DialogDescription>
              </DialogHeader>
              <Input
                type='number'
                placeholder='Enter seconds'
                value={adjustTimestampsBy}
                onChange={(e) => setAdjustTimestampsBy(e.target.value)}
                disabled={editorReadOnly}
              />
              <DialogClose asChild>
                <Button onClick={handleAdjustTimestamps} disabled={editorReadOnly}>Adjust</Button>
              </DialogClose>
            </DialogContent>
          </Dialog>
        </TooltipTrigger>
        <TooltipContent>
          <p>Adjust timestamps</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger>
          <PlayerButton
            icon={<ZoomInIcon className='w-4 h-4' />}
            tooltip='Increase font size'
            onClick={increaseFontSize}
            disabled={editorReadOnly}
          />
        </TooltipTrigger>
        <TooltipContent>
          <p>Increase font size (Ctrl+Shift+Up)</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger>
          <PlayerButton
            icon={<ZoomOutIcon className='w-4 h-4' />}
            tooltip='Decrease font size'
            onClick={decreaseFontSize}
            disabled={editorReadOnly}
          />
        </TooltipTrigger>
        <TooltipContent>
          <p>Decrease font size (Ctrl+Shift+Down)</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger>
          <PlayerButton
            icon={<ClockIcon className='w-4 h-4' />}
            tooltip='Insert timestamps'
            onClick={insertTimestampBlankAtCursorPositionInstance}
            disabled={editorReadOnly}
          />
        </TooltipTrigger>
        <TooltipContent>
          <p>Insert Timestamps (Shift+F12)</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger>
          <PlayerButton
            icon={<MagnifyingGlassIcon className='w-4 h-4' />}
            tooltip='Find and replace'
            onClick={toggleFindAndReplace}
            disabled={editorReadOnly}
          />
        </TooltipTrigger>
        <TooltipContent>
          <p>Find and Replace (Ctrl+F)</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger>
          <PlayerButton
            icon={
              highlightWordsEnabled ? (
                <LightningBoltIcon className='w-4 h-4' />
              ) : (
                <LightningBoltIcon className='opacity-50 w-4 h-4' />
              )
            }
            tooltip='Word Highlight'
            onClick={() => setHighlightWordsEnabled(!highlightWordsEnabled)}
            disabled={editorReadOnly}
          />
        </TooltipTrigger>
        <TooltipContent>
          <p>Toggle word highlighting</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger>
          <PlayerButton
            icon={<BinaryIcon className='w-4 h-4' />}
            tooltip='Highlight numerics'
            onClick={toggleHighlightNumerics}
            disabled={editorReadOnly}
          />
        </TooltipTrigger>
        <TooltipContent>
          <p>Highlight numerics</p>
        </TooltipContent>
      </Tooltip>

      {orderDetails.orgName.toLowerCase() === 'remotelegal' &&
        orderDetails.orderType === 'TRANSCRIPTION_FORMATTING' &&
        step === 'CF' && (
          <>
            <Tooltip>
              <TooltipTrigger>
                <PlayerButton
                  icon={<SpaceEvenlyVerticallyIcon className='w-4 h-4' />}
                  tooltip='Mark section'
                  onClick={markSection}
                  disabled={editorReadOnly}
                />
              </TooltipTrigger>
              <TooltipContent>
                <p>Mark section</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger>
                <PlayerButton
                  icon={<PersonIcon className='w-4 h-4' />}
                  tooltip='Mark examinee'
                  onClick={markExaminee}
                  disabled={editorReadOnly}
                />
              </TooltipTrigger>
              <TooltipContent>
                <p>Mark examinee</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger>
                <PlayerButton
                  icon={<Pencil2Icon className='w-4 h-4' />}
                  tooltip='Insert witness swear in line'
                  onClick={insertSwearInLine}
                  disabled={editorReadOnly}
                />
              </TooltipTrigger>
              <TooltipContent>
                <p>Insert witness swear in line</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger>
                <PlayerButton
                  icon={<Pencil1Icon className='w-4 h-4' />}
                  tooltip='Insert interpreter swear in line'
                  onClick={insertInterpreterSwearInLine}
                  disabled={editorReadOnly}
                />
              </TooltipTrigger>
              <TooltipContent>
                <p>Insert interpreter swear in line</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger>
                <Dialog>
                  <DialogTrigger asChild>
                    <PlayerButton
                      icon={<TimerOff className='w-4 h-4' />}
                      onClick={setSelectionHandler}
                      tooltip='Remove timestamps'
                      disabled={editorReadOnly}
                    />
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Remove Timestamps</DialogTitle>
                      <DialogDescription>
                        Timestamps will be removed permanently from the transcript. This action cannot be undone.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end space-x-2 mt-4">
                      <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                      </DialogClose>
                      <DialogClose asChild>
                        <Button variant="destructive" onClick={removeTimestamps}>Remove</Button>
                      </DialogClose>
                    </div>
                  </DialogContent>
                </Dialog>
              </TooltipTrigger>
              <TooltipContent>
                <p>Remove timestamps</p>
              </TooltipContent>
            </Tooltip>
          </>
    )}
    </TooltipProvider>
  )
}
