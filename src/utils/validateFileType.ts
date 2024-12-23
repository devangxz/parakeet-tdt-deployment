import { ALLOWED_FILE_TYPES } from "@/constants";

export const getAllowedFileExtensions = () => Object.keys(ALLOWED_FILE_TYPES);

export const getAllowedMimeTypes = () =>
    Array.from(new Set(Object.values(ALLOWED_FILE_TYPES).flat()));

export const getFileTypeFromExtension = (fileName: string): string => {
    const fileExtension = '.' + fileName.split('.').pop()?.toLowerCase();
    const allowedMimeTypes = ALLOWED_FILE_TYPES[fileExtension as keyof typeof ALLOWED_FILE_TYPES];

    return allowedMimeTypes?.[0] || 'invalid';
};

const validateFileType = (file: File): boolean => {
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    return !!ALLOWED_FILE_TYPES[fileExtension as keyof typeof ALLOWED_FILE_TYPES];
};

export default validateFileType;