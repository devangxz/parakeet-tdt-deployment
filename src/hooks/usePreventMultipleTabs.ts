import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const usePreventMultipleTabs = (pageId: string) => {
    const [isActive, setIsActive] = useState(true);
    const router = useRouter();

    useEffect(() => {
        // Create a unique key for this page
        const storageKey = `editor-tab-${pageId}`;
        const channelName = `editor-channel-${pageId}`;

        // Create a BroadcastChannel for cross-tab communication
        const channel = new BroadcastChannel(channelName);

        // Generate a unique tab ID
        const tabId = Math.random().toString(36).substring(2, 15);

        // Function to check if we should have access
        const checkAccess = () => {
            const existingTab = localStorage.getItem(storageKey);
            const lastHeartbeat = localStorage.getItem(`${storageKey}-heartbeat`);

            // Check if the existing tab is stale (no heartbeat for 3 seconds)
            if (lastHeartbeat && Date.now() - parseInt(lastHeartbeat) > 3000) {
                localStorage.removeItem(storageKey);
                localStorage.removeItem(`${storageKey}-heartbeat`);
                return true;
            }

            if (!existingTab) {
                // No other tab has claimed access
                localStorage.setItem(storageKey, tabId);
                localStorage.setItem(`${storageKey}-heartbeat`, Date.now().toString());
                setIsActive(true);
                return true;
            }

            if (existingTab === tabId) {
                // We already have access
                localStorage.setItem(`${storageKey}-heartbeat`, Date.now().toString());
                return true;
            }

            // Another tab has access
            setIsActive(false);
            return false;
        };

        // Request access when component mounts
        checkAccess();

        // Set up heartbeat to maintain access
        const heartbeatInterval = setInterval(() => {
            if (checkAccess()) {
                // Broadcast that we're still active
                channel.postMessage({ type: 'heartbeat', tabId });
            }
        }, 1000);

        // Handle messages from other tabs
        channel.addEventListener('message', (event) => {
            if (event.data.type === 'heartbeat' && event.data.tabId !== tabId) {
                // Another tab is active, we should redirect if we thought we were active
                if (isActive) {
                    setIsActive(false);
                    router.push('/editor-already-open');
                }
            }
        });

        // Clean up when component unmounts
        const handleUnload = () => {
            const currentTab = localStorage.getItem(storageKey);
            if (currentTab === tabId) {
                localStorage.removeItem(storageKey);
                localStorage.removeItem(`${storageKey}-heartbeat`);
            }
        };

        window.addEventListener('beforeunload', handleUnload);

        return () => {
            clearInterval(heartbeatInterval);
            window.removeEventListener('beforeunload', handleUnload);
            channel.close();
            handleUnload();
        };
    }, [pageId, isActive, router]);

    return isActive;
};

export default usePreventMultipleTabs;