type LoginMessages = typeof import("./messages/singup/en.json");
// Importing other language files ..

// Create a new type by combining all message types
type Messages = LoginMessages & ProfileMessages;

declare interface IntlMessages extends Messages {}
