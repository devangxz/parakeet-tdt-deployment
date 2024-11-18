'use client'

import { ArrowLeftIcon, CaretDownIcon, Cross1Icon, PlusIcon } from '@radix-ui/react-icons'
import axios from 'axios';
import Image from "next/image";
import { useSession } from 'next-auth/react'
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import ReactQuill from 'react-quill';
import { toast as toastInstance } from 'sonner'

import ConfigureShortcutsDialog from './ConfigureShortcutsDialog';
import ShortcutsReferenceDialog from './ShortcutsReferenceDialog';
import { Checkbox } from '../ui/checkbox';
import { Textarea } from '../ui/textarea';
import { OrderDetails } from '@/app/editor/[fileId]/page';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DialogFooter } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select"
import { FILE_CACHE_URL } from '@/constants';
import axiosInstance from '@/utils/axios';
import DefaultShortcuts, { ShortcutControls, setShortcut, getAllShortcuts, useShortcuts } from '@/utils/editorAudioPlayerShortcuts';
import { downloadMP3, replaceTextHandler, searchAndSelect } from '@/utils/editorUtils';
type NewHeaderProps = {
    editorModeOptions: string[];
    getEditorMode: (editorMode: string) => void;
    editorMode: string;
    notes: string;
    setNotes: React.Dispatch<React.SetStateAction<string>>;
    quillRef: React.RefObject<ReactQuill> | undefined;
    orderDetails: OrderDetails;
    audioPlayer: HTMLAudioElement | null;
    submitting: boolean;
    setIsSubmitModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
    toggleSpellCheck: () => void;
    setSubmitting: React.Dispatch<React.SetStateAction<boolean>>;
};

export default function NewHeader({ editorModeOptions, getEditorMode, editorMode, notes, setNotes, quillRef, orderDetails, audioPlayer, submitting, setIsSubmitModalOpen, toggleSpellCheck, setSubmitting }: NewHeaderProps) {
    const [newEditorMode, setNewEditorMode] = useState<string>('')
    const [notesOpen, setNotesOpen] = useState(false);
    const [shortcuts, setShortcuts] = useState<{ key: string, shortcut: string }[]>([]);
    const [position, setPosition] = useState({ x: 100, y: 100 });
    const [findAndReplaceOpen, setFindAndReplaceOpen] = useState(false);
    const [findText, setFindText] = useState('');
    const [lastSearchIndex, setLastSearchIndex] = useState<number>(-1)
    const [replaceText, setReplaceText] = useState('');
    const [matchCase, setMatchCase] = useState(false);
    const [videoPlayerOpen, setVideoPlayerOpen] = useState(false);
    const [revertTranscriptOpen, setRevertTranscriptOpen] = useState(false);
    const [isSpeakerNameModalOpen, setIsSpeakerNameModalOpen] = useState(false);
    const [speakerName, setSpeakerName] = useState<{ [key: string]: string } | null>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const [autoCapitalize, setAutoCapitalize] = useState(true);
    const autoCapitalizeRef = useRef(autoCapitalize);
    const previousEditorContentRef = useRef('');
    const [isShortcutsReferenceModalOpen, setIsShortcutsReferenceModalOpen] = useState(false);
    const [isConfigureShortcutsModalOpen, setIsConfigureShortcutsModalOpen] = useState(false);
    const { data: session } = useSession()
    const [isFormattingOptionsModalOpen, setIsFormattingOptionsModalOpen] = useState(false);
    const [formattingOptions, setFormattingOptions] = useState({
        timeCoding: true,
        speakerTracking: true,
        nameFormat: 'initials'
    })
    const [allPublicTemplates, setAllPublicTemplates] = useState<{ name: string, id: string }[]>([])
    const [currentTemplate, setCurrentTemplate] = useState('1')

    const [existingOptions, setExistingOptions] = useState<string>('')

    const getFormattingOptions = async () => {
        try {
            const response = await axios.get(`/api/editor/get-formatting-options?orderId=${orderDetails.orderId}`)
            const { options, templates, currentTemplate } = response.data
            setFormattingOptions({
                timeCoding: options.ts === 1,
                speakerTracking: options.sif === 1,
                nameFormat: options.si === 0 ? 'initials' : 'full-names'
            })
            setAllPublicTemplates(templates.map((temp: { name: string, id: number }) => ({ ...temp, id: temp.id.toString() })))
            setCurrentTemplate(currentTemplate.id.toString())
            setExistingOptions(JSON.stringify(options))
        } catch (error) {
            toastInstance.error('Failed to fetch formatting options')
        }
    }

    useEffect(() => {
        if (orderDetails.orderId) {
            getFormattingOptions()
        }
    }, [orderDetails.orderId])

    useEffect(() => {
        setShortcuts(getAllShortcuts());
    }, []);

    const updateShortcut = (action: keyof DefaultShortcuts, newShortcut: string) => {
        setShortcut(action, newShortcut);
        setShortcuts(getAllShortcuts());
    };

    const replaceTextInstance = (findText: string, replaceText: string, replaceAll = false) => {
        if (!quillRef?.current) return;
        const quill = quillRef.current.getEditor();
        replaceTextHandler(quill, findText, replaceText, replaceAll, matchCase, toastInstance);
    };

    const searchAndSelectInstance = (searchText: string) => {
        if (!quillRef?.current) return;
        const quill = quillRef.current.getEditor();
        searchAndSelect(quill, searchText, matchCase, lastSearchIndex, setLastSearchIndex, toastInstance);
    };

    useEffect(() => {
        autoCapitalizeRef.current = autoCapitalize;
    }, [autoCapitalize]);

    const shortcutControls = useMemo(() => {
        const controls: Partial<ShortcutControls> = {
            findNextOccurrenceOfString: () => {
                if (!findAndReplaceOpen) {
                    setFindAndReplaceOpen(true);
                } else if (findText) {
                    searchAndSelectInstance(findText);
                }
            },
            findThePreviousOccurrenceOfString: () => {
                if (!findAndReplaceOpen) {
                    setFindAndReplaceOpen(true);
                } else if (findText) {
                    searchAndSelectInstance(findText);
                }
            },
            replaceNextOccurrenceOfString: () => {
                if (!findAndReplaceOpen) {
                    setFindAndReplaceOpen(true);
                } else if (findText && replaceText) {
                    replaceTextInstance(findText, replaceText);
                }
            },
            replaceAllOccurrencesOfString: () => {
                if (!findAndReplaceOpen) {
                    setFindAndReplaceOpen(true);
                } else if (findText && replaceText) {
                    replaceTextInstance(findText, replaceText, true);
                }
            },
            repeatLastFind: () => {
                if (findText) {
                    searchAndSelectInstance(findText);
                }
            },
        };
        return controls as ShortcutControls;
    }, [findAndReplaceOpen, findText, replaceText]);

    useShortcuts(shortcutControls);

    useEffect(() => {
        const syncVideoWithAudio = () => {
            if (!audioPlayer || !videoRef.current) return;
            videoRef.current.volume = 0;
            audioPlayer.onplay = () => videoRef.current?.play();
            audioPlayer.onpause = () => videoRef.current?.pause();
            audioPlayer.onseeked = () => {
                if (!videoRef.current) return

                videoRef.current.currentTime = audioPlayer.currentTime;
            };
            audioPlayer.onseeking = () => {
                if (videoRef.current) videoRef.current.currentTime = audioPlayer.currentTime;
            };

        };

        syncVideoWithAudio();
        const interval = setInterval(() => {
            if (!audioPlayer || !videoRef.current) return;
            if (videoRef.current && audioPlayer.currentTime !== videoRef.current.currentTime) {
                videoRef.current.currentTime = audioPlayer.currentTime
            }
        }, 1000)

        return () => {
            clearInterval(interval)
        }
    }, [audioPlayer, videoRef, videoPlayerOpen]);

    const toggleVideo = () => {
        setVideoPlayerOpen(!videoPlayerOpen);
    }

    const handleAutoCapitalize = useCallback((
        delta: { ops: { insert?: string | object; delete?: number; retain?: number; attributes?: { [key: string]: unknown } }[] },
        oldDelta: { ops: { insert?: string | object; delete?: number; retain?: number; attributes?: { [key: string]: unknown } }[] },
        source: 'api' | 'user' | 'silent'
    ) => {
        if (!quillRef?.current || !autoCapitalizeRef.current || source !== 'user') return;

        const quill = quillRef.current.getEditor();
        const newText = quill.getText();
        if (newText === previousEditorContentRef.current) return;

        const change = delta.ops[0];

        const shouldCapitalize = (index: number): boolean =>
            index === 0 || (index > 0 && /[.!?]\s$/.test(newText.slice(0, index)));

        const capitalizeChar = (index: number): void => {
            const char = newText[index];
            if (/^[a-zA-Z]$/.test(char) && char !== char.toUpperCase()) {
                quill.deleteText(index, 1);
                quill.insertText(index, char.toUpperCase(), quill.getFormat());
                quill.setSelection(index + 1, 0);
            }
        };

        if ('insert' in change || ('retain' in change && newText.length > previousEditorContentRef.current.length)) {
            const insertIndex = 'retain' in change ? change.retain || 0 : 0;
            if (shouldCapitalize(insertIndex)) {
                capitalizeChar(insertIndex);
            }
        } else if ('delete' in change) {
            const deleteIndex = 'retain' in change ? change.retain || 0 : 0;
            if (deleteIndex > 0 && shouldCapitalize(deleteIndex)) {
                capitalizeChar(deleteIndex);
            }
        }

        previousEditorContentRef.current = newText;
    }, [quillRef]);

    useEffect(() => {
        if (!quillRef?.current) return;

        const quill = quillRef.current.getEditor();
        quill.on('text-change', handleAutoCapitalize);

        return () => {
            quill.off('text-change', handleAutoCapitalize);
        };
    }, [quillRef, handleAutoCapitalize]);

    const handleDragChange = (e: React.MouseEvent<HTMLDivElement | HTMLVideoElement>) => {
        e.preventDefault();
        const target = e.target as HTMLDivElement; // Correctly typecast the event target
        const onMouseMove = (moveEvent: MouseEvent) => {
            setPosition({
                x: moveEvent.clientX - deltaX,
                y: moveEvent.clientY - deltaY,
            });
        };

        const deltaX = e.clientX - target.getBoundingClientRect().left;
        const deltaY = e.clientY - target.getBoundingClientRect().top;

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', () => {
            document.removeEventListener('mousemove', onMouseMove);
        }, { once: true });
    }

    const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const text = e.target.value
        setNotes(text)
    }

    const toggleAutoCapitalize = () => {
        setAutoCapitalize(!autoCapitalize)
    }

    const toggleNotes = () => {
        setNotesOpen(!notesOpen);
    }

    const toggleFindAndReplace = () => {
        setFindAndReplaceOpen(!findAndReplaceOpen);
    }

    const toggleRevertTranscript = () => {
        setRevertTranscriptOpen(!revertTranscriptOpen);
    }

    const toggleSpeakerName = async () => {
        // Extract unique speakers from the transcript
        try {
            if (quillRef && quillRef.current && !speakerName) {
                const quill = quillRef.current.getEditor();
                const text = quill.getText();
                const speakerRegex = /\d{1,2}:\d{2}:\d{2}\.\d\s+(S\d+):/g;
                const speakers = new Set<string>();
                let match;

                while ((match = speakerRegex.exec(text)) !== null) {
                    speakers.add(match[1]);
                }

                const response = await axios.get(`/api/editor/get-speaker-names?fileId=${orderDetails.fileId}`);
                const speakerNamesList = response.data;
                // Update the speakerName state
                const newSpeakerNames: Record<string, string> = {};
                const maxSpeakers = Math.max(speakers.size, speakerNamesList.length);

                for (let i = 0; i < maxSpeakers; i++) {
                    const speaker = Array.from(speakers)[i] || `S${i + 1}`;
                    if (speakerNamesList && speakerNamesList[i] && (speakerNamesList[i].fn || speakerNamesList[i].ln)) {
                        const { fn, ln } = speakerNamesList[i];
                        newSpeakerNames[speaker] = `${fn} ${ln}`.trim();
                    } else {
                        newSpeakerNames[speaker] = `Speaker ${i + 1}`;
                    }
                }

                setSpeakerName(prevState => ({
                    ...prevState,
                    ...newSpeakerNames
                }));

            }
            setIsSpeakerNameModalOpen(!isSpeakerNameModalOpen);
        } catch (error) {
            toastInstance.error('An error occurred while opening the speaker name modal')
        }
    };

    const handleFindChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const text = e.target.value
        setFindText(text)
    }

    const handleReplaceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const text = e.target.value
        setReplaceText(text)
    }

    const findHandler = () => {
        searchAndSelectInstance(findText);
    }

    const replaceOneHandler = () => {
        replaceTextInstance(findText, replaceText);
    }

    const replaceAllHandler = () => {
        replaceTextInstance(findText, replaceText, true);
    }

    const handleSpeakerNameChange = (e: React.ChangeEvent<HTMLInputElement>, key: string) => {
        setSpeakerName(prev => ({ ...prev, [key]: e.target.value }))
    }

    const updateSpeakerName = async () => {
        const toastId = toastInstance.loading('Updating speaker names...')
        try {
            await axios.post("/api/editor/update-speaker-name", {
                speakerName: speakerName,
                fileId: orderDetails.fileId,
            })
            toastInstance.dismiss(toastId)
            toastInstance.success('Speaker names updated successfully')
            setIsSpeakerNameModalOpen(false)
            if (submitting) {
                toggleSpellCheck()
            }
        } catch (error) {
            toastInstance.dismiss(toastId)
            toastInstance.error('Failed to update speaker names')
        }
    }

    const addSpeakerName = async () => {
        if (!speakerName) return
        const newKey = `S${Object.keys(speakerName).length + 1}`;
        setSpeakerName(prev => ({
            ...prev,
            [newKey]: 'Speaker ' + (Object.keys(speakerName).length + 1)
        }));
    }

    const revertTranscript = async () => {
        const toastId = toastInstance.loading('Reverting transcript...')
        try {
            await axiosInstance.post(`${FILE_CACHE_URL}/revert-transcript`, {
                fileId: orderDetails.fileId,
                type: 'QC'
            })
            toastInstance.success('Transcript reverted successfully')
            localStorage.removeItem('transcript')
            window.location.reload();
            return;
        } catch (error) {
            toastInstance.dismiss(toastId)
            toastInstance.error('Failed to revert transcript')
        }
    }

    const handleFormattingOptionChange = async () => {
        const toastId = toastInstance.loading('Updating formatting options...')
        try {
            await axios.post(`/api/editor/set-formatting-options`, {
                orderId: orderDetails.orderId,
                formattingOptions,
                newTemplateId: +currentTemplate,
                existingOptions: JSON.parse(existingOptions)
            })
            toastInstance.dismiss(toastId)
            toastInstance.success('Formatting options updated successfully')
            localStorage.removeItem('transcript')
            window.location.reload() // Refresh the page after success
        } catch (error) {
            toastInstance.dismiss(toastId)
            toastInstance.error('Failed to update formatting options')
        }
    }

    const requestExtension = async () => {
        const toastId = toastInstance.loading('Requesting extension...')
        try {
            await axios.post(`/api/editor/request-extension`, {
                orderId: orderDetails.orderId,
            })

            window.location.reload();
            toastInstance.dismiss(toastId)
            toastInstance.success('Extension requested successfully')
        } catch (error) {
            toastInstance.dismiss(toastId)
            toastInstance.error('Failed to request extension')
        }
    }

    useEffect(() => {
        if (submitting && orderDetails.status === 'QC_ASSIGNED') {
            toggleSpeakerName()
        }
        if (submitting && orderDetails.status !== 'QC_ASSIGNED') {
            setIsSubmitModalOpen(true)
        }
    }, [submitting])

    return <header className="bg-white px-16 flex justify-between items-center py-5 shadow">
        <div>
            <div className="flex items-center w-28 justify-between">
                <div className="w-10">
                    <Image src="/assets/images/logo.svg" className="w-full" alt="scribie" width={30} height={30} />
                </div>
                <div className="h-10 w-[1px] bg-gray-200"></div>
                <span className="font-semibold">Editor</span>
            </div>
        </div>
        <div>
            <div className="flex items-center">
                <div><Button className='h-10'><ArrowLeftIcon className='mr-2' />Back To Files</Button></div>
                <Dialog>
                    <DropdownMenu>
                        <DropdownMenuTrigger className='flex border border-gray-200 px-3 rounded-3xl items-center ml-3 h-10 shadow-none hover:bg-accent transition-colors'>
                            <div className='flex items-center justify-center mr-2'>
                                Options
                            </div>
                            <CaretDownIcon />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => setIsShortcutsReferenceModalOpen(true)}>Shortcuts Reference</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setIsConfigureShortcutsModalOpen(true)}>Configure Shortcuts</DropdownMenuItem>
                            {session?.user?.role !== 'CUSTOMER' && <DropdownMenuItem onClick={toggleRevertTranscript}>Revert Transcript</DropdownMenuItem>}
                            <DropdownMenuItem onClick={toggleVideo}>Toggle Video</DropdownMenuItem>
                            <DropdownMenuItem onClick={toggleNotes}>Notes</DropdownMenuItem>
                            <DropdownMenuItem onClick={toggleFindAndReplace}>Find and Replace</DropdownMenuItem>
                            <DropdownMenuItem onClick={toggleSpeakerName}>Speaker Names</DropdownMenuItem>
                            <DropdownMenuItem onClick={downloadMP3.bind(null, orderDetails)}>Download MP3</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleSpellCheck()}>Spellcheck</DropdownMenuItem>
                            <DropdownMenuItem onClick={requestExtension}>Request Extension</DropdownMenuItem>
                            <DropdownMenuItem onClick={toggleAutoCapitalize}>
                                {autoCapitalize ? 'Disable' : 'Enable'} Auto Capitalize
                            </DropdownMenuItem>
                            {session?.user?.role === 'CUSTOMER' && <DropdownMenuItem onClick={() => setIsFormattingOptionsModalOpen(true)}>Formatting Options</DropdownMenuItem>}
                            <DialogTrigger asChild>
                                {/* <DropdownMenuItem>Change Editor Mode</DropdownMenuItem> */}
                            </DialogTrigger>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle className='mb-5'>Change Editor Mode</DialogTitle>
                            <div>
                                <RadioGroup defaultValue={editorMode} onValueChange={setNewEditorMode} className='flex gap-10 mb-5'>
                                    {editorModeOptions.map((option, index) => (
                                        <div className="flex items-center space-x-2" key={index}>
                                            <RadioGroupItem value={option} id={option} />
                                            <Label htmlFor={option}>{option}</Label>
                                        </div>
                                    ))}
                                </RadioGroup>
                            </div>
                            <DialogClose asChild>
                                <Button onClick={() => getEditorMode(newEditorMode)}>Confirm</Button>
                            </DialogClose>
                        </DialogHeader>
                    </DialogContent>
                </Dialog>

            </div>
        </div>

        <ShortcutsReferenceDialog isShortcutsReferenceModalOpen={isShortcutsReferenceModalOpen} setIsShortcutsReferenceModalOpen={setIsShortcutsReferenceModalOpen} shortcuts={shortcuts} setShortcuts={setShortcuts} />
        <ConfigureShortcutsDialog isConfigureShortcutsModalOpen={isConfigureShortcutsModalOpen} setIsConfigureShortcutsModalOpen={setIsConfigureShortcutsModalOpen} shortcuts={shortcuts} updateShortcut={updateShortcut} />

        <Dialog open={isSpeakerNameModalOpen} onOpenChange={(value) => {
            setIsSpeakerNameModalOpen(value)
            if (!value) {
                setSubmitting(false)
            }
        }}>
            <DialogContent className="max-w-4xl w-2/4">
                <DialogHeader>
                    <DialogTitle>Speaker Names</DialogTitle>
                    <DialogDescription>
                        Please enter the speaker names below
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {speakerName && Object.entries(speakerName).map(([key, value], index) => (
                        <div key={key} className="flex items-center justify-start space-x-2">
                            <Label htmlFor={key}>{key}:</Label>
                            <Input
                                id={key}
                                value={value}
                                onChange={(e) => handleSpeakerNameChange(e, key)}
                                className="w-4/5"
                            />
                            {index === Object.entries(speakerName).length - 1 && (
                                <button onClick={addSpeakerName} title='Add Speaker' className="ml-2 text-red-500 font-bold">
                                    <PlusIcon />
                                </button>
                            )}
                        </div>
                    ))}
                </div>

                <div className="space-y-4 mt-4">
                    <p className="text-sm text-gray-500">Please follow the rules below to determine the speaker name, in order:</p>
                    <ol className="list-decimal list-inside text-sm text-gray-500 space-y-1">
                        <li>The name as spoken in the audio if the customer instruction is present.</li>
                        <li>The name as mentioned in the customer instructions.</li>
                        <li>If the customer instructions (CI) explicitly stated that we should use the names they listed in the CI instead of the names mentioned in the audio, then that CI should be followed.</li>
                        <li>Leave blank otherwise. Do <strong>NOT</strong> use Interviewer/Interviewee or any other format unless specified explicitly by the customer.</li>
                    </ol>
                    <p className="text-sm font-semibold">Customer Instructions:</p>
                    <p className="text-sm text-gray-500 italic">
                        {/* Add actual customer instructions here if available */}
                        No specific instructions provided.
                    </p>
                </div>

                <div className="mt-6 flex justify-between">
                    <DialogClose asChild>
                        <Button variant="outline">
                            Close
                        </Button>
                    </DialogClose>
                    <Button onClick={updateSpeakerName}>Update</Button>
                </div>
            </DialogContent>
        </Dialog>

        <Dialog open={revertTranscriptOpen} onOpenChange={setRevertTranscriptOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Revert Transcript</DialogTitle>
                    <DialogDescription>
                        Please confirm that the transcript has to be reverted to the original version.
                    </DialogDescription>
                    <div className='h-2'></div>
                    <div className='flex justify-center items-center text-center text-red-500'>
                        All edits made will be discarded. This action is irreversible and cannot be un-done. If you have made any changes, then we recommend that you save the current version by copy pasting it into a new document before reverting.
                    </div>
                    <div className='h-2' />
                    <div className='flex justify-end'>
                        <Button className='mr-2' variant="destructive" onClick={revertTranscript}>Revert</Button>
                        <Button variant="outline" onClick={() => setRevertTranscriptOpen(false)}>Cancel</Button>
                    </div>
                </DialogHeader>
            </DialogContent>
        </Dialog>

        <Dialog open={isFormattingOptionsModalOpen} onOpenChange={setIsFormattingOptionsModalOpen}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Formatting Options</DialogTitle>
                    <DialogDescription className='text-center text-red-500'>
                        These options discard all changes made and reverts the transcript to the delivered version. Please set these options before making any edits.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="time-coding"
                            checked={formattingOptions.timeCoding}
                            onCheckedChange={(checked) =>
                                setFormattingOptions(prev => ({ ...prev, timeCoding: checked as boolean }))
                            }
                        />
                        <Label htmlFor="time-coding">Time-coding</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="speaker-tracking"
                            checked={formattingOptions.speakerTracking}
                            onCheckedChange={(checked) =>
                                setFormattingOptions(prev => ({ ...prev, speakerTracking: checked as boolean }))
                            }
                        />
                        <Label htmlFor="speaker-tracking">Speaker Tracking</Label>
                    </div>
                    <RadioGroup
                        value={formattingOptions.nameFormat}
                        onValueChange={(value) =>
                            setFormattingOptions(prev => ({ ...prev, nameFormat: value }))
                        }
                        className="pl-6 space-y-2"
                    >
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="initials" id="initials" />
                            <Label htmlFor="initials">Initials</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="full-names" id="full-names" />
                            <Label htmlFor="full-names">Full Names</Label>
                        </div>
                    </RadioGroup>
                    <div className="space-y-2">
                        <Label htmlFor="template">Template</Label>
                        <Select
                            value={currentTemplate}
                            onValueChange={(value) =>
                                setCurrentTemplate(value)
                            }
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select a template" />
                            </SelectTrigger>
                            <SelectContent>
                                {allPublicTemplates.map((template) => (
                                    <SelectItem key={template.id} value={template.id}>
                                        {template.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={() => setIsFormattingOptionsModalOpen(false)}>Close</Button>
                    <Button type="submit" onClick={handleFormattingOptionChange}>Apply</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {
            notesOpen && <div
                className="fixed bg-white z-[1000] overflow-auto py-4 px-4 rounded-lg shadow-lg overflow-y-hidden border"
                style={{ top: `${position.y}px`, left: `${position.x}px`, width: '500px', height: '400px', resize: 'both' }}
            >
                <div onMouseDown={handleDragChange} className='cursor-move border-b flex justify-between items-center pb-2'>
                    <p className='text-lg font-semibold'>Notes</p>
                    <button onClick={toggleNotes} className='cursor-pointer hover:bg-gray-100 p-2 rounded-lg'><Cross1Icon /> </button>
                </div>
                <Textarea
                    placeholder='Start typing...'
                    className='h-5/6 resize-none mt-5'
                    value={notes}
                    onChange={handleNotesChange}
                />
            </div>
        }

        <div
            className={` ${!videoPlayerOpen ? 'hidden' : ''} fixed bg-white z-[999] overflow-hidden rounded-lg shadow-lg border aspect-video bg-transparent`}
            style={{ top: `${position.y}px`, left: `${position.x}px`, width: '500px', resize: 'horizontal' }}
        >
            <div className='relative w-full h-full'>
                <video
                    ref={videoRef}
                    src={`/api/editor/get-video/${orderDetails.fileId}`}
                    className='w-full h-full'
                    controls={false}
                    onMouseDown={handleDragChange}
                ></video>
                <button
                    onClick={() => setVideoPlayerOpen(false)}
                    className='absolute top-0 right-0 cursor-pointer bg-gray-100 p-2 rounded-lg mr-2 mt-2'
                    style={{ zIndex: 1 }}
                >
                    <Cross1Icon />
                </button>
            </div>
        </div>

        {
            findAndReplaceOpen && <div
                className="fixed bg-white z-[1000] overflow-auto py-4 px-4 rounded-lg shadow-lg overflow-y-hidden border"
                style={{ top: `${position.y}px`, left: `${position.x}px`, width: '500px', }}
            >
                <div onMouseDown={handleDragChange} className='cursor-move border-b flex justify-between items-center pb-2'>
                    <p className='text-lg font-semibold'>Find and Replace</p>
                    <button onClick={toggleFindAndReplace} className='cursor-pointer hover:bg-gray-100 p-2 rounded-lg'><Cross1Icon /></button>
                </div>
                <div className='mt-5'>
                    <Input
                        placeholder='Find...'
                        className='mb-4'
                        value={findText}
                        onChange={handleFindChange}
                    />
                    <Input
                        placeholder='Replace with...'
                        value={replaceText}
                        onChange={handleReplaceChange}
                    />
                </div>
                <div className='flex items-center mt-4'>
                    <Button className='mr-2' onClick={findHandler}>Find</Button>
                    <Button className='mr-2' onClick={replaceOneHandler}>Replace Once</Button>
                    <Button className='mr-2' onClick={replaceAllHandler}>Replace All</Button>
                    <Label className="flex items-center space-x-2">
                        <Checkbox checked={matchCase} onCheckedChange={(checked) => setMatchCase(checked === true)} />
                        <span>Match case</span>
                    </Label>
                </div>
            </div>
        }
    </header >;
}