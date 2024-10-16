type LoginMessages = typeof import("./messages/singup/en.json");
// Importing other language files ..

// Create a new type by combining all message types
type Messages = LoginMessages & ProfileMessages;

declare interface IntlMessages extends Messages { }

declare module 'tinykeys' {
    export function tinykeys(
        target: Window | HTMLElement,
        keyBindings: Record<string, (event: KeyboardEvent) => void>
    ): () => void;
}

declare module 'simple-spellchecker';