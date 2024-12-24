'use client'

import { useState, KeyboardEvent } from 'react';
import { toast } from 'sonner';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
import { formatShortcutKey, formatAction } from '@/components/editor/ShortcutsReferenceDialog';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import DefaultShortcuts from '@/utils/editorAudioPlayerShortcuts';

interface ConfigureShortcutsDialogProps {
    isConfigureShortcutsModalOpen: boolean;
    setIsConfigureShortcutsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
    shortcuts: {
        key: string;
        shortcut: string;
    }[];
    updateShortcut: (action: keyof DefaultShortcuts, newShortcut: string) => void;
}

const ConfigureShortcutsDialog = ({ isConfigureShortcutsModalOpen, setIsConfigureShortcutsModalOpen, shortcuts, updateShortcut }: ConfigureShortcutsDialogProps) => {
    const [selectedAction, setSelectedAction] = useState<keyof DefaultShortcuts | ''>('');
    const [newShortcut, setNewShortcut] = useState<string>('');

    const handleConfigureShortcutKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        e.preventDefault();

        const { key, ctrlKey, shiftKey, altKey, metaKey } = e;

        const keyMap: { [key: string]: string } = {
            'ctrl': 'Control',
            'arrowup': 'ArrowUp',
            'arrowdown': 'ArrowDown',
            'arrowleft': 'ArrowLeft',
            'arrowright': 'ArrowRight',
        };

        const combination = [];
        if (ctrlKey) combination.push('Control');
        if (shiftKey) combination.push('Shift');
        if (altKey) combination.push('Alt');
        if (metaKey) combination.push('Command');
        if (key !== 'Control' && key !== 'Shift' && key !== 'Alt' && key !== 'Meta') {
            combination.push(keyMap[key.toLowerCase()] || key);
        }

        setNewShortcut(combination.map(k => k.charAt(0).toUpperCase() + k.slice(1)).join('+'));
    }

    const handleConfigureShortcutSave = () => {
        if (selectedAction === '' || newShortcut === '') {
            toast.error(selectedAction === '' ? "Please select an action" : "Please enter a shortcut");
            return;
        }

        // Find any existing action using this shortcut
        const existingAction = shortcuts.find(item => item.shortcut === newShortcut);
        if (existingAction) {
            // Get the current shortcut of the selected action
            const currentShortcut = shortcuts.find(item => item.key === selectedAction)?.shortcut;
            if (currentShortcut) {
                // Swap shortcuts between the two actions
                updateShortcut(existingAction.key as keyof DefaultShortcuts, currentShortcut);
                toast.info(`Shortcut "${formatShortcutKey(currentShortcut)}" has been assigned to "${formatAction(existingAction.key)}"`);
            }
        }

        updateShortcut(selectedAction, newShortcut);
        setIsConfigureShortcutsModalOpen(false);
        setSelectedAction('');
        setNewShortcut('');
        toast.success(`Shortcut for "${selectedAction}" successfully configured to "${formatShortcutKey(newShortcut)}"`);
    }

    return (
        <Dialog open={isConfigureShortcutsModalOpen} onOpenChange={setIsConfigureShortcutsModalOpen}>
            <DialogContent className="p-0 gap-0">
                <DialogHeader className="p-4">
                    <DialogTitle>Configure Shortcuts</DialogTitle>
                    <DialogDescription>
                        Configure all your shortcuts.
                    </DialogDescription>
                </DialogHeader>
                <div className="p-4 pt-1 space-y-4">
                    <Select value={selectedAction} onValueChange={(value) => setSelectedAction(value as keyof DefaultShortcuts)}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select an action" />
                        </SelectTrigger>
                        <SelectContent position="popper" sideOffset={5} className="max-h-[300px] overflow-y-auto">
                            <SelectGroup>
                                <SelectLabel>Actions</SelectLabel>
                                {shortcuts.map((item) => (
                                    <SelectItem key={item.key} value={item.key}>{formatAction(item.key)}</SelectItem>
                                ))}
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                    <Input
                        value={formatShortcutKey(newShortcut)}
                        onKeyDown={handleConfigureShortcutKeyDown}
                        type='text'
                        placeholder='Enter a shortcut'
                    />
                    <Button onClick={handleConfigureShortcutSave} className="w-full">Save</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default ConfigureShortcutsDialog