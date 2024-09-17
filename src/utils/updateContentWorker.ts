import { updateContent } from "@/components/editor/transcriptUtils";

self.addEventListener('message', (event) => {
    const { quillContent, lines } = event.data;
    const updatedCtms = updateContent(quillContent, lines);
    self.postMessage(updatedCtms);
});