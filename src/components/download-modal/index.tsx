'use client'
import { DialogDescription } from '@radix-ui/react-dialog'
import { ReloadIcon } from '@radix-ui/react-icons'
import JSZip from 'jszip';
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '../ui/button'
import { Checkbox } from '../ui/checkbox'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog'
import { Label } from '../ui/label'
import { fileCacheTokenAction } from '@/app/actions/auth/file-cache-token';
import { getZipFilesAction } from '@/app/actions/order/get-zip-files'

interface DownloadDialogProps {
    isDownloadDialogOpen: boolean
    setIsDownloadDialogOpen: (isMoveFileDialogOpen: boolean) => void
    fileIds: string[]
}

const DownloadModal = ({
    isDownloadDialogOpen,
    setIsDownloadDialogOpen,
    fileIds,
}: DownloadDialogProps) => {
    const [step, setStep] = useState(1)
    const [downloadUrl, setDownloadUrl] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [selectedTypes, setSelectedTypes] = useState<{ [key: string]: boolean }>({
        'microsoft-word': false,
        'pdf': false,
        'plain-text': false,
        'vtt': false,
        'srt': false,
    })

    async function downloadFilesAsZip(files: { name: string, content: Blob }[]) {
        const zip = new JSZip();

        // Add files to the zip
        for (const file of files) {
            // You can organize files in folders by using paths
            // Example: zip.file('folder1/file.txt', fileContent)
            zip.file(file.name, file.content);
        }

        try {
            // Generate the zip file
            const content = await zip.generateAsync({
                type: 'blob',
                compression: 'DEFLATE',
                compressionOptions: {
                    level: 6 // Compression level (1-9)
                }
            });

            // Create download link
            const url = window.URL.createObjectURL(content);
            setDownloadUrl(url)

            return true;
        } catch (error) {
            console.error('Error creating zip file:', error);
            return false;
        }
    }

    async function downloadRemoteFilesAsZip(fileUrls: { url: string, name: string }[]) {
        const files = await Promise.all(
            fileUrls.map(async (file) => {
                const response = await fetch(file.url);
                const blob = await response.blob();
                return {
                    name: `${fileUrls.length}-files/${file.name}`,
                    content: blob
                };
            })
        );

        await downloadFilesAsZip(files);
    }

    const handleSelectAllTypes = () => {
        setSelectedTypes({
            'microsoft-word': true,
            'pdf': true,
            'plain-text': true,
            'vtt': true,
            'srt': true,
        })
    }

    const handleDownloadStep = async () => {
        const toastId = toast.loading('Generating zip file...')
        setIsLoading(true)
        try {
            const tokenRes = await fileCacheTokenAction();
            const authToken = tokenRes.token;
            const res = await getZipFilesAction(fileIds, Object.entries(selectedTypes)
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                .filter(([_, isSelected]) => isSelected)
                .map(([type]) => type), authToken)
            if (res.success && res.data) {
                await downloadRemoteFilesAsZip(res.data)
                setStep(2)
                setIsLoading(false)
                toast.dismiss(toastId)

            } else {
                throw new Error('Failed to download file')
            }
        } catch (error) {
            toast.dismiss(toastId)
            toast.error('Failed to download file')
            setIsLoading(false)
            setIsDownloadDialogOpen(false)
        }
    }

    const handleOpenChange = (value: boolean) => {
        setIsDownloadDialogOpen(value)
        setStep(1)
        setSelectedTypes({
            'microsoft-word': false,
            'pdf': false,
            'plain-text': false,
            'vtt': false,
            'srt': false,
        })
    }

    return <Dialog open={isDownloadDialogOpen} onOpenChange={handleOpenChange}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Download Zip</DialogTitle>
                <DialogDescription className='text-sm text-gray-500'>
                    Please select all the formats of transcript files you would like to download
                </DialogDescription>
            </DialogHeader>
            {(step === 1 && !isLoading) && <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                    <p className="text-sm text-blue-600 border border-blue-200 rounded p-2 bg-blue-50">
                        For formatting orders only <span className="font-bold">Microsoft Word</span> and <span className="font-bold">PDF</span> will be downloaded.
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <Checkbox checked={selectedTypes['microsoft-word']} onCheckedChange={(isChecked) => setSelectedTypes({ ...selectedTypes, 'microsoft-word': !!isChecked })} id="microsoft-word" />
                    <Label htmlFor="microsoft-word">Microsoft Word</Label>
                </div>
                <div className="flex items-center space-x-2">
                    <Checkbox checked={selectedTypes['pdf']} onCheckedChange={(isChecked) => setSelectedTypes({ ...selectedTypes, 'pdf': !!isChecked })} id="pdf" />
                    <Label htmlFor="pdf">Adobe PDF</Label>
                </div>
                <div className="flex items-center space-x-2">
                    <Checkbox checked={selectedTypes['plain-text']} onCheckedChange={(isChecked) => setSelectedTypes({ ...selectedTypes, 'plain-text': !!isChecked })} id="plain-text" />
                    <Label htmlFor="plain-text">Plain Text</Label>
                </div>
                <div className="flex items-center space-x-2">
                    <Checkbox checked={selectedTypes['vtt']} onCheckedChange={(isChecked) => setSelectedTypes({ ...selectedTypes, 'vtt': !!isChecked })} id="vtt" />
                    <Label htmlFor="vtt">WebVTT Subtitle</Label>
                </div>
                <div className="flex items-center space-x-2">
                    <Checkbox checked={selectedTypes['srt']} onCheckedChange={(isChecked) => setSelectedTypes({ ...selectedTypes, 'srt': !!isChecked })} id="srt" />
                    <Label htmlFor="srt">SubRip Subtitle</Label>
                </div>
            </div>}

            {isLoading && <div className="flex items-center justify-center">
                <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
                <p>Loading...</p>
            </div>}

            {(step === 2 && !isLoading) && <div className="flex items-center justify-center">
                <a download="files.zip" className='text-blue-500 hover:text-blue-600' href={downloadUrl}>files.zip</a>
            </div>
            }

            <DialogFooter>
                <Button variant="secondary" disabled={step === 2} className='w-full' onClick={handleSelectAllTypes} type="submit">Select All</Button>
                {step === 1 && <Button className='w-full' onClick={handleDownloadStep}>Next</Button>}
                {step === 2 && <Button disabled={isLoading} className='w-full' asChild><a download="files.zip" href={downloadUrl}>Download</a></Button>}
            </DialogFooter>
        </DialogContent>
    </Dialog>
}

export default DownloadModal