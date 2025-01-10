import { ClockIcon, MagnifyingGlassIcon, Pencil1Icon, Pencil2Icon, PersonIcon, SpaceEvenlyVerticallyIcon, TextAlignLeftIcon, ThickArrowLeftIcon, ThickArrowRightIcon, TimerIcon, ZoomInIcon, ZoomOutIcon } from "@radix-ui/react-icons";

import PlayerButton from "./PlayerButton";
import { Button } from "../ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { Input } from "../ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { OrderDetails } from "@/app/editor/[fileId]/page";

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
}: ToolbarProps) {
    return <TooltipProvider>
        <Tooltip>
            <TooltipTrigger>
                <PlayerButton
                    icon={<ThickArrowRightIcon />}
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
                    icon={<ThickArrowLeftIcon />}
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
                    icon={<TextAlignLeftIcon />}
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
                            icon={<TimerIcon />}
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
                            onChange={(e) =>
                                setAdjustTimestampsBy(e.target.value)
                            }
                        />
                        <DialogClose asChild>
                            <Button onClick={handleAdjustTimestamps}>
                                Adjust
                            </Button>
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
                    icon={<ZoomInIcon />}
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
                    icon={<ZoomOutIcon />}
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
                    icon={<ClockIcon />}
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
                    icon={<MagnifyingGlassIcon />}
                    tooltip='Find and replace'
                    onClick={toggleFindAndReplace}
                />
            </TooltipTrigger>
            <TooltipContent>
                <p>Find and Replace</p>
            </TooltipContent>
        </Tooltip>

        {orderDetails.orgName.toLowerCase() === 'remotelegal' &&
            <>
                <Tooltip>
                    <TooltipTrigger>
                        <PlayerButton
                            icon={<SpaceEvenlyVerticallyIcon />}
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
                            icon={<PersonIcon />}
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
                            icon={<Pencil2Icon />}
                            tooltip='Insert swear in line'
                            onClick={insertSwearInLine}
                        />
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Insert swear in line</p>
                    </TooltipContent>
                </Tooltip>

                <Tooltip>
                    <TooltipTrigger>
                        <PlayerButton
                            icon={<Pencil1Icon />}
                            tooltip='Insert interpreter swear in line'
                            onClick={insertInterpreterSwearInLine}
                        />
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Insert swear in line</p>
                    </TooltipContent>
                </Tooltip>
            </>
        }
    </TooltipProvider>
}