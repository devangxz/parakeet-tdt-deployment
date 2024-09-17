'use client'

import hotkeys from 'hotkeys-js';

interface DefaultShortcuts {
    playPause: string;
    seekForward: string;
    seekBackward: string;
    volumeDown: string;
    volumeUp: string;
    increaseSpeed: string;
    decreaseSpeed: string;
    playAt75Percent: string;
    playAt100Percent: string;
    searchWordUnderCursor: string;
    correctSpelling: string;
    insertTimestamps: string;
    insertSpeakerName: string;
    playWord: string;
    nextPage: string;
    prevPage: string;
}

const defaultShortcuts: DefaultShortcuts = {
    playPause: 'ctrl+p',
    seekForward: 'right',
    seekBackward: 'left',
    volumeDown: 'down',
    volumeUp: 'up',
    increaseSpeed: 'ctrl+alt+up',
    decreaseSpeed: 'ctrl+alt+down',
    playAt100Percent: 'ctrl+alt+right',
    playAt75Percent: 'ctrl+alt+left',
    searchWordUnderCursor: 'alt+s',
    correctSpelling: 'alt+m',
    insertTimestamps: 'ctrl+t',
    insertSpeakerName: 'shift+f12',
    playWord: 'alt+double-click',
    nextPage: 'ctrl+]',
    prevPage: 'ctrl+[',
};

const shortcutsNameMap = {
    playPause: 'Play/Pause',
    seekForward: 'Seek Forward 10 Seconds',
    seekBackward: 'Seek Backward 10 Seconds',
    volumeDown: 'Volume Down',
    volumeUp: 'Volume Up',
    increaseSpeed: 'Increase Speed',
    decreaseSpeed: 'Decrease Speed',
    playAt75Percent: 'Play at 75% speed',
    playAt100Percent: 'Play at 100% speed',
    searchWordUnderCursor: 'Search word under cursor',
    correctSpelling: 'Correct spelling',
    insertTimestamps: 'Insert timestamps',
    insertSpeakerName: 'Insert speaker name',
    playWord: 'Play word',
    nextPage: 'Next page',
    prevPage: 'Previous page',
}

const setShortcut = (action: keyof DefaultShortcuts, key: string): void => {
    const shortcutsJson = localStorage.getItem('shortcuts') || JSON.stringify(defaultShortcuts);
    if (shortcutsJson) {
        const shortcuts = JSON.parse(shortcutsJson) || {};
        shortcuts[action] = key;
        localStorage.setItem('shortcuts', JSON.stringify(shortcuts));
        return;
    }
};

const getShortcut = (action: keyof DefaultShortcuts): string => {
    const shortcutsJson = localStorage.getItem('shortcuts')
    if (shortcutsJson) {
        const shortcuts = JSON.parse(shortcutsJson) || {};
        return shortcuts[action] || defaultShortcuts[action];
    } else {
        return defaultShortcuts[action];
    }
};

const getAllShortcuts = (): { key: string, shortcut: string, originalKey: string }[] => {
    const shortcutsJson = localStorage.getItem('shortcuts');
    const loadedShortcuts = shortcutsJson ? JSON.parse(shortcutsJson) : defaultShortcuts;
    return Object.entries(loadedShortcuts).map(([action, key]) => ({
        key: shortcutsNameMap[action as keyof DefaultShortcuts],
        shortcut: key as string, // Explicitly cast key to string to resolve type error
        originalKey: action as string
    }));
}
interface shortcutControls {
    playPause: () => void;
    seekForward: () => void;
    seekBackward: () => void;
    volumeDown: () => void;
    volumeUp: () => void;
    increaseSpeed: () => void;
    decreaseSpeed: () => void;
    playAt75Percent: () => void;
    playAt100Percent: () => void;
    searchWordUnderCursor: () => void;
    correctSpelling: () => void;
    insertTimestamps: () => void;
    playWord: () => void;
}

const bindShortcuts = (shortcutControls: shortcutControls): void => {
    const shortcuts: DefaultShortcuts = {
        playPause: getShortcut('playPause'),
        seekForward: getShortcut('seekForward'),
        seekBackward: getShortcut('seekBackward'),
        volumeDown: getShortcut('volumeDown'),
        volumeUp: getShortcut('volumeUp'),
        increaseSpeed: getShortcut('increaseSpeed'),
        decreaseSpeed: getShortcut('decreaseSpeed'),
        playAt100Percent: getShortcut('playAt100Percent'),
        playAt75Percent: getShortcut('playAt75Percent'),
        searchWordUnderCursor: getShortcut('searchWordUnderCursor'),
        correctSpelling: getShortcut('correctSpelling'),
        insertTimestamps: getShortcut('insertTimestamps'),
        insertSpeakerName: getShortcut('insertSpeakerName'),
        playWord: getShortcut('playWord'),
        nextPage: getShortcut('nextPage'),
        prevPage: getShortcut('prevPage'),
    };
    hotkeys.filter = function (event) {
        const target = event.target || event.srcElement;
        if (target instanceof HTMLElement) {
            const tagName = target.tagName;

            // Ignore key events in input, select, and textarea
            return !(tagName === 'INPUT' || tagName === 'SELECT' || tagName === 'TEXTAREA' || target.isContentEditable);
        }
        return true;
    };

    // Bind play/pause
    hotkeys(shortcuts.playPause, (event) => {
        event.preventDefault();
        shortcutControls.playPause();
    });

    // Bind forward 10 seconds
    hotkeys(shortcuts.seekForward, (event) => {
        event.preventDefault();
        shortcutControls.seekForward();
    });

    // Bind backward 10 seconds
    hotkeys(shortcuts.seekBackward, (event) => {
        event.preventDefault();
        shortcutControls.seekBackward();
    });

    hotkeys(shortcuts.volumeDown, (event) => {
        event.preventDefault();
        shortcutControls.volumeDown();
    });

    hotkeys(shortcuts.volumeUp, (event) => {
        event.preventDefault();
        shortcutControls.volumeUp();
    });

    hotkeys(shortcuts.increaseSpeed, (event) => {
        event.preventDefault();
        shortcutControls.increaseSpeed();
    });

    hotkeys(shortcuts.decreaseSpeed, (event) => {
        event.preventDefault();
        shortcutControls.decreaseSpeed();
    });

    hotkeys(shortcuts.playAt100Percent, (event) => {
        event.preventDefault();
        shortcutControls.playAt100Percent();
    });

    hotkeys(shortcuts.playAt75Percent, (event) => {
        event.preventDefault();
        shortcutControls.playAt75Percent();
    });
    hotkeys(shortcuts.searchWordUnderCursor, (event) => {
        event.preventDefault();
        shortcutControls.searchWordUnderCursor();
    });
};

export { setShortcut, bindShortcuts, getAllShortcuts };
export default DefaultShortcuts;
