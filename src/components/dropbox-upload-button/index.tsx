import React, { useEffect, useRef } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';

interface DropboxFile {
    filename: string;
    url: string;
}
interface DropboxSaveOptions {
    files: DropboxFile[];
    success: () => void;
    cancel: () => void;
    error: (error: Error) => void;
}

interface DropboxChooserOptions {
    success: (files: Array<{
        name: string;
        link: string;
        bytes: number;
        icon: string;
        thumbnailLink?: string;
        isDir?: boolean;
    }>) => void;
    cancel?: () => void;
    linkType?: 'preview' | 'direct';
    multiselect?: boolean;
    extensions?: string[];
    folderselect?: boolean;
    sizeLimit?: number;
}

interface DropboxSDK {
    save: (options: DropboxSaveOptions) => void;
    choose: (options: DropboxChooserOptions) => void;
}

declare global {
    interface Dropbox {
        save: (options: DropboxSaveOptions) => void;
    }
}

interface DropboxUploadButtonProps {
    files: DropboxFile[];
}

export const DropboxUploadButton = ({
    files = [],
}: DropboxUploadButtonProps) => {
    const dropboxRef = useRef<DropboxSDK | null>(null);

    useEffect(() => {
        // Load Dropbox SDK
        const script = document.createElement('script');
        script.src = 'https://www.dropbox.com/static/api/2/dropins.js';
        script.id = 'dropboxjs';
        script.setAttribute('data-app-key', process.env.NEXT_PUBLIC_DROPBOX_APP_KEY!);
        script.async = true;
        script.onload = initializeDropbox;
        document.body.appendChild(script);

        return () => {
            document.body.removeChild(script);
        };
    }, []);

    const initializeDropbox = () => {
        if (window.Dropbox &&
            'save' in window.Dropbox &&
            typeof window.Dropbox.save === 'function') {
            dropboxRef.current = window.Dropbox as DropboxSDK;
        }
    };

    const handleSaveToDropbox = () => {
        if (!dropboxRef.current) {
            console.error('Dropbox SDK not loaded');
            return;
        }

        const options: DropboxSaveOptions = {
            files: files,
            success: () => {
                toast.success('Files saved successfully to Dropbox!');
            },
            cancel: () => {
                toast.error('Save to Dropbox cancelled');
            },
            error: () => {
                toast.error('Error saving to Dropbox');
            }
        };

        dropboxRef.current.save(options);
    };

    return (
        <Button
            variant="outline"
            size="sm"
            onClick={handleSaveToDropbox}
        >
            Save to Dropbox
        </Button>
    );
};