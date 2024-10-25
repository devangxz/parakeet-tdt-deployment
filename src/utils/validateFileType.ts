import { ALLOWED_FILE_TYPES } from "@/constants";

export const getAllowedFileExtensions = () => Object.keys(ALLOWED_FILE_TYPES);

export const getAllowedMimeTypes = () =>
    Array.from(new Set(Object.values(ALLOWED_FILE_TYPES).flat()));

const validateFileType = (file: File): boolean => {
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    const fileType = file.type.toLowerCase();

    // Check if extension is allowed
    if (!ALLOWED_FILE_TYPES[fileExtension as keyof typeof ALLOWED_FILE_TYPES]) {
        return false;
    }

    // If file has a MIME type, validate it against allowed MIME types for that extension
    if (fileType) {
        return ALLOWED_FILE_TYPES[fileExtension as keyof typeof ALLOWED_FILE_TYPES].includes(fileType);
    }

    // If no MIME type is available, allow based on extension only
    return true;
};

export default validateFileType;