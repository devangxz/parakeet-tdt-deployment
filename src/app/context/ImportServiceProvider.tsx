'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { toast } from 'sonner';

interface ImportServiceState {
    isDropboxServiceReady: boolean;
    isBoxServiceReady: boolean;
    isOneDriveServiceReady: boolean;
    isGoogleDriveServiceReady: boolean;
}

interface ImportServiceContextType extends ImportServiceState {
    initializeImportService: (service: keyof ImportServiceState) => Promise<void>;
    initializeDropbox: () => Promise<void>;
}

const ImportServiceContext = createContext<ImportServiceContextType | undefined>(undefined);

const DROPBOX_APP_KEY = process.env.NEXT_PUBLIC_DROPBOX_APP_KEY!;

export const useImportService = () => {
    const context = useContext(ImportServiceContext);
    if (context === undefined) {
        throw new Error('useImportService must be used within an ImportServiceProvider');
    }
    return context;
};

const ImportServiceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, setState] = useState<ImportServiceState>({
        isDropboxServiceReady: false,
        isBoxServiceReady: false,
        isOneDriveServiceReady: false,
        isGoogleDriveServiceReady: false,
    });

    const initializeDropbox = async () => {
        try {
            const existingScript = document.getElementById('dropboxjs');
            if (existingScript) {
                existingScript.remove();
            }

            const script = document.createElement('script');
            script.id = 'dropboxjs';
            script.src = 'https://www.dropbox.com/static/api/2/dropins.js';

            script.dataset.appKey = DROPBOX_APP_KEY;

            await new Promise<void>((resolve, reject) => {
                script.onload = () => {
                    setTimeout(() => {
                        if (window.Dropbox) {
                            setState(prev => ({ ...prev, isDropboxServiceReady: true }));
                            resolve();
                        } else {
                            reject(new Error('Dropbox failed to initialize'));
                        }
                    }, 100);
                };

                script.onerror = () => reject(new Error('Failed to load Dropbox script'));

                document.body.appendChild(script);
            });

        } catch (error) {
            throw error;
        }
    };

    const initializeImportService = async (service: keyof ImportServiceState) => {
        if (state[service]) return;

        try {
            switch (service) {
                case 'isBoxServiceReady':
                    await new Promise<void>((resolve, reject) => {
                        document.querySelectorAll('script[src*="box.com"]')
                            .forEach(script => script.remove());

                        const script = document.createElement('script');
                        script.src = 'https://app.box.com/js/static/select.js';
                        script.async = true;
                        script.onload = () => setTimeout(() => {
                            if (window.BoxSelect) {
                                setState(prev => ({ ...prev, isBoxServiceReady: true }));
                                resolve();
                            } else {
                                reject(new Error('Failed to load Box script'));
                            }
                        }, 100);
                        script.onerror = () => reject(new Error('Failed to load Box script'));
                        document.body.appendChild(script);
                    });
                    break;

                case 'isOneDriveServiceReady':
                    await new Promise<void>((resolve, reject) => {
                        document.querySelectorAll('script[src*="onedrive.js"]')
                            .forEach(script => script.remove());

                        const script = document.createElement('script');
                        script.src = 'https://js.live.net/v7.2/OneDrive.js';
                        script.async = true;
                        script.onload = () => setTimeout(() => {
                            if (window.OneDrive) {
                                setState(prev => ({ ...prev, isOneDriveServiceReady: true }));
                                resolve();
                            } else {
                                reject(new Error('Failed to load OneDrive script'));
                            }
                        }, 100);
                        script.onerror = () => reject(new Error('Failed to load OneDrive script'));
                        document.body.appendChild(script);
                    });
                    break;

                case 'isGoogleDriveServiceReady':
                    await new Promise<void>((resolve, reject) => {
                        document.querySelectorAll('script[src*="google"]')
                            .forEach(script => script.remove());

                        const apiScript = document.createElement('script');
                        apiScript.src = 'https://apis.google.com/js/api.js';
                        apiScript.async = true;

                        const gsiScript = document.createElement('script');
                        gsiScript.src = 'https://accounts.google.com/gsi/client';
                        gsiScript.async = true;

                        Promise.all([
                            new Promise<void>((resolveApi) => {
                                apiScript.onload = () => resolveApi();
                                apiScript.onerror = () => reject(new Error('Failed to load Google API script'));
                                document.body.appendChild(apiScript);
                            }),
                            new Promise<void>((resolveGsi) => {
                                gsiScript.onload = () => resolveGsi();
                                gsiScript.onerror = () => reject(new Error('Failed to load Google GSI script'));
                                document.body.appendChild(gsiScript);
                            })
                        ]).then(() => {
                            window?.gapi?.load('picker', () => {
                                if (window.google?.picker) {
                                    setState(prev => ({ ...prev, isGoogleDriveServiceReady: true }));
                                    resolve();
                                } else {
                                    reject(new Error('Failed to load Google Picker'));
                                }
                            });
                        });
                    });
                    break;
            }
        } catch (error) {
            const serviceName = service.replace('is', '').replace('ServiceReady', '');
            toast.error(`Failed to initialize ${serviceName}`);
        }
    };

    useEffect(() => {
        initializeImportService('isBoxServiceReady');
        initializeImportService('isOneDriveServiceReady');
        initializeImportService('isGoogleDriveServiceReady');

        return () => {
            const scripts = document.querySelectorAll(
                'script[src*="dropbox.com"], script[src*="box.com"], script[src*="live.net"], script[src*="google"]'
            );
            scripts.forEach(script => script.remove());

            setState({
                isDropboxServiceReady: false,
                isBoxServiceReady: false,
                isOneDriveServiceReady: false,
                isGoogleDriveServiceReady: false,
            });

            if (window.Dropbox) delete window.Dropbox;
            if (window.BoxSelect) delete window.BoxSelect;
            if (window.OneDrive) delete window.OneDrive;
            if (window.gapi) delete window.gapi;
        };
    }, []);

    return (
        <ImportServiceContext.Provider value={{ ...state, initializeImportService, initializeDropbox }}>
            {children}
        </ImportServiceContext.Provider>
    );
};

export default ImportServiceProvider;