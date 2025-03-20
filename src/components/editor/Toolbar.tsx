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
import { TimerOff } from 'lucide-react'

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
import { OrderDetails } from '@/app/editor/[fileId]/page'

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
}: ToolbarProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <PlayerButton
            icon={<ThickArrowRightIcon className='w-4 h-4' />}
            onClick={playNextBlankInstance}
            tooltip='Play next blank'
          />
        </TooltipTrigger>
        <TooltipContent>
          <p>Play next blank</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger>
          <PlayerButton
            icon={<ThickArrowLeftIcon className='w-4 h-4' />}
            onClick={playPreviousBlankInstance}
            tooltip='Play previous blank'
          />
        </TooltipTrigger>
        <TooltipContent>
          <p>Play previous blank</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger>
          <PlayerButton
            icon={<TextAlignLeftIcon className='w-4 h-4' />}
            tooltip='Play audio from the start of current paragraph'
            onClick={playCurrentParagraphInstance}
          />
        </TooltipTrigger>
        <TooltipContent>
          <p>Play audio from the start of current paragraph</p>
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
              />
              <DialogClose asChild>
                <Button onClick={handleAdjustTimestamps}>Adjust</Button>
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
          />
        </TooltipTrigger>
        <TooltipContent>
          <p>Increase font size</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger>
          <PlayerButton
            icon={<ZoomOutIcon className='w-4 h-4' />}
            tooltip='Decrease font size'
            onClick={decreaseFontSize}
          />
        </TooltipTrigger>
        <TooltipContent>
          <p>Decrease font size</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger>
          <PlayerButton
            icon={<ClockIcon className='w-4 h-4' />}
            tooltip='Insert timestamps'
            onClick={insertTimestampBlankAtCursorPositionInstance}
          />
        </TooltipTrigger>
        <TooltipContent>
          <p>Insert Timestamps</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger>
          <PlayerButton
            icon={<MagnifyingGlassIcon className='w-4 h-4' />}
            tooltip='Find and replace'
            onClick={toggleFindAndReplace}
          />
        </TooltipTrigger>
        <TooltipContent>
          <p>Find and Replace</p>
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
          />
        </TooltipTrigger>
        <TooltipContent>
          <p>Toggle word highlighting</p>
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
