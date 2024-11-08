// Common Upload State Types
export interface BaseUploadState {
    uploadId: string | null;
    key: string | null;
    completedParts: { ETag?: string; PartNumber: number }[];
    totalUploaded: number;
    lastFailedPart: number | null;
}

export interface StreamingState extends BaseUploadState {
    buffer: Uint8Array[];
    bufferSize: number;
    partNumber: number;
    abortController: AbortController;
    downloadedBytes: number;
    totalSize: number;
}

// Common File Types
export interface BaseFileInfo {
    name: string;
    size: number;
    fileId: string;
}

// FileAndFolderUploader Types
export interface FileWithId extends BaseFileInfo {
    type: string;
    file: File;
    isRLDocx: boolean;
}

export interface CustomInputAttributes extends React.InputHTMLAttributes<HTMLInputElement> {
    directory?: string;
    webkitdirectory?: string;
}

// LinkImporter Types
export interface QueuedLink extends BaseFileInfo {
    url: string;
    fileName: string;
    type: string;
}

// GoogleDriveImporter Types
export interface GoogleDriveFile {
    id: string;
    name: string;
    mimeType: string;
    sizeBytes: string;
}

export interface GooglePickerResponse {
    action: string;
    docs: GoogleDriveFile[];
}

export interface GoogleDocsView {
    setMimeTypes(mimeTypes: string): GoogleDocsView;
    setIncludeFolders(include: boolean): GoogleDocsView;
}

export interface GooglePicker {
    setVisible(visible: boolean): void;
}

export interface GooglePickerBuilder {
    addView(view: GoogleDocsView): GooglePickerBuilder;
    enableFeature(feature: string): GooglePickerBuilder;
    setTitle(title: string): GooglePickerBuilder;
    setAppId(appId: string): GooglePickerBuilder;
    setOAuthToken(token: string): GooglePickerBuilder;
    setDeveloperKey(key: string): GooglePickerBuilder;
    setCallback(callback: (data: GooglePickerResponse) => void): GooglePickerBuilder;
    build(): GooglePicker;
}

export interface TokenResponse {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
}

// Common Props Type
export interface UploaderProps {
    onUploadSuccess: (success: boolean) => void;
}

// Global Type Augmentations
declare global {
    interface Window {
        google: {
            accounts: {
                oauth2: {
                    initTokenClient(config: {
                        client_id: string;
                        scope: string;
                        access_type: string;
                        prompt: string;
                        callback: (response: TokenResponse) => void;
                    }): { requestAccessToken: () => void };
                    initCodeClient(config: {
                        client_id: string;
                        scope: string;
                        ux_mode: string;
                        callback: (response: { error?: string; code?: string }) => void;
                    }): { requestCode: () => void };
                };
            };
            picker: {
                DocsView: new () => GoogleDocsView;
                PickerBuilder: new () => GooglePickerBuilder;
                Action: {
                    PICKED: string;
                };
                Feature: {
                    MULTISELECT_ENABLED: string;
                    SUPPORT_DRIVES: string;
                };
            };
        };
        gapi: {
            load(api: string, callback: () => void): void;
        };
    }
}