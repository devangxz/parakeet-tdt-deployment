'use client'

import { ArrowLeftIcon, CaretDownIcon, Cross1Icon } from '@radix-ui/react-icons'
import Image from "next/image";
import { KeyboardEvent, useEffect, useState } from 'react';

import { Textarea } from '../ui/textarea';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/components/ui/use-toast"
import DefaultShortcuts, { getAllShortcuts, setShortcut } from '@/utils/editorAudioPlayerShortcuts';

export default function Header({ editorModeOptions, getEditorMode, editorMode, notes, setNotes }: { editorModeOptions: string[], getEditorMode: (editorMode: string) => void, editorMode: string, notes: string, setNotes: React.Dispatch<React.SetStateAction<string>> }) {
    const [isShortcutReferenceModalOpen, setIsShortcutReferenceModalOpen] = useState(false)
    const [isShortcutConfigModalOpen, setIsShortcutConfigModalOpen] = useState(false)
    const [selectedAction, setSelectedAction] = useState<keyof DefaultShortcuts | ''>('')
    const [newShortcut, setNewShortcut] = useState<string>('')
    const [shortcuts, setShortcuts] = useState<{ key: string, shortcut: string }[]>([]);
    const [newEditorMode, setNewEditorMode] = useState<string>('')
    const [notesOpen, setNotesOpen] = useState(false);
    const [position, setPosition] = useState({ x: 100, y: 100 });

    const { toast } = useToast()
    useEffect(() => {
        setShortcuts(getAllShortcuts());
    }, [])

    const handleShortcutConfigSave = () => {
        const toastStyle = {
            background: '#FAE7E7',
            color: '#F06868',
            borderColor: '#F17A7A'
        }
        if (selectedAction === '' || newShortcut === '') {
            toast({
                title: selectedAction === '' ? "Please select an action" : "Please enter a shortcut",
                style: toastStyle,

            })
            return;
        }

        for (let i = 0; i < shortcuts.length; i++) {
            const item = shortcuts[i];
            if (item.shortcut.toUpperCase() === newShortcut.toUpperCase()) {
                toast({
                    title: `This shortcut is already in use for ${item.key}`,
                    style: toastStyle,
                })
                return;
            }
        }
        setShortcut(selectedAction, newShortcut);
        setIsShortcutConfigModalOpen(false);
        setSelectedAction('');
        setNewShortcut('');
    }

    const handleShortcutConfigKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        e.preventDefault();

        // Gather the key pressed and any modifiers
        const { key, ctrlKey, shiftKey, altKey, metaKey, code } = e;

        // Build the combination string, excluding the name of the modifier if the corresponding modifier key was not pressed
        let combination = '';
        if (ctrlKey) combination += 'Ctrl+';
        if (shiftKey) combination += 'Shift+';
        if (altKey) combination += 'Alt+';
        if (metaKey) combination += 'Command+';
        if (key !== 'Control' && key !== 'Shift' && key !== 'Alt' && key !== 'Meta') {
            if (altKey) {
                combination += code.replace('Key', '');
            } else {
                combination += key;
            }
        }

        setNewShortcut(combination);
    }

    const handleDragChange = (e: React.MouseEvent<HTMLDivElement>) => {
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

    const toggleNotes = () => {
        setNotesOpen(!notesOpen);
    }

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
                            <DropdownMenuItem onClick={() => setIsShortcutReferenceModalOpen(true)}>Shortcuts Reference</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setIsShortcutConfigModalOpen(true)}>Configure Shortcuts</DropdownMenuItem>
                            <DropdownMenuItem onClick={toggleNotes}>Notes</DropdownMenuItem>
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
        <Dialog open={isShortcutReferenceModalOpen} onOpenChange={setIsShortcutReferenceModalOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Shortcuts Reference</DialogTitle>
                    <DialogDescription>
                        Reference to all your shortcuts.
                    </DialogDescription>
                    <ScrollArea className="max-h-[500px] rounded-md border p-4">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Action</TableHead>
                                    <TableHead>Shortcuts</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {shortcuts.map((item) => (
                                    <TableRow key={item.key}>
                                        <TableCell className="font-medium">{item.key}</TableCell>
                                        <TableCell>{item.shortcut.toUpperCase()}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </DialogHeader>
            </DialogContent>
        </Dialog>
        <Dialog open={isShortcutConfigModalOpen} onOpenChange={setIsShortcutConfigModalOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Configure Shortcuts</DialogTitle>
                    <DialogDescription>
                        Configure all your shortcuts.
                    </DialogDescription>
                    <div className='h-2'></div>
                    <div className='flex flex-col h-36 justify-between'>
                        <Select value={selectedAction} onValueChange={(value) => setSelectedAction(value as keyof DefaultShortcuts)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select an action" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    <SelectLabel>Actions</SelectLabel>
                                    {shortcuts.map((item) => (
                                        <SelectItem key={item.key} value={item.key}>{item.key}</SelectItem>
                                    ))}
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                        <Input value={newShortcut} onKeyDown={handleShortcutConfigKeyDown} type='text' placeholder='Enter a shortcut' />
                        <Button onClick={handleShortcutConfigSave}>Save</Button>
                    </div>
                </DialogHeader>
            </DialogContent>
        </Dialog>

        {notesOpen && <div
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
        </div>}
    </header >;
}