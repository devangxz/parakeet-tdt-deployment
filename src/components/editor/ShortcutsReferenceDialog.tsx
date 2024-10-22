import { toast } from 'sonner';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
import { ScrollArea } from "../ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { restoreDefaultShortcuts, getAllShortcuts } from "@/utils/editorAudioPlayerShortcuts";

interface ShortcutsReferenceDialogProps {
    isShortcutsReferenceModalOpen: boolean;
    setIsShortcutsReferenceModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
    shortcuts: {
        key: string;
        shortcut: string;
    }[];
    setShortcuts: React.Dispatch<React.SetStateAction<{
        key: string;
        shortcut: string;
    }[]>>;
}

export const formatShortcutKey = (shortcut: string) => shortcut.split('+')
    .map(word => word.trim())
    .map(word => {
        switch (word) {
            case 'Control': return 'Ctrl';
            case 'ArrowUp': return 'Up';
            case 'ArrowDown': return 'Down';
            case 'ArrowLeft': return 'Home';
            case 'ArrowRight': return 'End';
            default: return word;
        }
    })
    .join('+');

export const formatAction = (key: string) => key
    .replace(/([A-Z])/g, ' $1')
    .replace(/(\d+)/g, ' $1')
    .toLowerCase()
    .replace(/^\w/, c => c.toUpperCase())
    .trim();

const ShortcutsReferenceDialog = ({ isShortcutsReferenceModalOpen, setIsShortcutsReferenceModalOpen, shortcuts, setShortcuts }: ShortcutsReferenceDialogProps) => {
    const handleRestoreDefaults = () => {
        restoreDefaultShortcuts();
        const updatedShortcuts = getAllShortcuts();
        setShortcuts(updatedShortcuts);
        toast.success('Default shortcuts have been successfully restored');
    };

    return (
        <Dialog open={isShortcutsReferenceModalOpen} onOpenChange={setIsShortcutsReferenceModalOpen}>
            <DialogContent className="p-0 gap-0">
                <DialogHeader className="p-4">
                    <DialogTitle>Shortcuts Reference</DialogTitle>
                    <DialogDescription>
                        Reference to all your shortcuts.
                    </DialogDescription>
                </DialogHeader>
                <div className="m-4 mt-1 rounded-md border">
                    <Table>
                        <TableHeader className="sticky top-0 z-10">
                            <TableRow>
                                <TableHead className="w-1/3">Shortcut Key</TableHead>
                                <TableHead className="w-2/3">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                    </Table>
                    <ScrollArea className="h-[60vh]">
                        <Table>
                            <TableBody>
                                {shortcuts.map((item) => (
                                    <TableRow key={item?.key}>
                                        <TableCell className="w-1/3">{formatShortcutKey(item?.shortcut)}</TableCell>
                                        <TableCell className="w-2/3">{formatAction(item?.key)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </div>
                <div className="flex justify-end items-center gap-x-2 m-4 mt-1">
                    <Button onClick={handleRestoreDefaults}>
                        Restore Defaults
                    </Button>
                    <Button onClick={() => setIsShortcutsReferenceModalOpen(false)} variant="outline">
                        Close
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default ShortcutsReferenceDialog