import { updatePartialAlignment } from '../alignments'
import { AlignmentType } from '@/utils/types/transcript'

// Mock functions
const mockCharToWordIndex = (text: string, charIndex: number): number => {
    const textUpToIndex = text.slice(0, charIndex);
    return textUpToIndex.split(/\s+/).filter(word => word.trim() !== '').length;
};

const mockUpdateAlignments = (newText: string, currentAlignments: AlignmentType[]): AlignmentType[] => currentAlignments;

describe('updatePartialAlignment - Realignment Scenarios', () => {
    it('should handle single word insertion in the middle', () => {
        const alignments: AlignmentType[] = [
            { word: 'the',   type: 'ctm', start: 0,   end: 0.3, conf: 1.0, punct: 'the',   source: 'assembly_ai', speaker: 'S1', turn: 1 },
            { word: 'quick', type: 'ctm', start: 0.4, end: 0.7, conf: 1.0, punct: 'quick', source: 'assembly_ai', speaker: 'S1', turn: 1 },
            { word: 'brown', type: 'ctm', start: 0.8, end: 1.1, conf: 1.0, punct: 'brown', source: 'assembly_ai', speaker: 'S1', turn: 1 },
            { word: 'fox',   type: 'ctm', start: 1.2, end: 1.5, conf: 1.0, punct: 'fox',   source: 'assembly_ai', speaker: 'S1', turn: 1 },
        ];

        // Insert "test" between "quick" and "brown"
        const normalizedText = 'the quick test brown fox';
        // Position after "quick" (index ~10) and before "brown" (index ~15).
        const minOffset = 10;
        const maxOffset = 15;

        const result = updatePartialAlignment(
            normalizedText,
            minOffset,
            maxOffset,
            alignments,
            mockUpdateAlignments,
            mockCharToWordIndex
        );

        expect(result.length).toBe(5);
        expect(result[2].word).toBe('test');
        expect(result[2].type).toBe('edit');
    });

    it('should handle single word deletion', () => {
        const alignments: AlignmentType[] = [
            { word: 'the',   type: 'ctm', start: 0,   end: 0.3, conf: 1.0, punct: 'the',   source: 'assembly_ai', speaker: 'S1', turn: 1 },
            { word: 'quick', type: 'ctm', start: 0.4, end: 0.7, conf: 1.0, punct: 'quick', source: 'assembly_ai', speaker: 'S1', turn: 1 },
            { word: 'brown', type: 'ctm', start: 0.8, end: 1.0, conf: 1.0, punct: 'brown', source: 'assembly_ai', speaker: 'S1', turn: 1 },
            { word: 'fox',   type: 'ctm', start: 1.1, end: 1.4, conf: 1.0, punct: 'fox',   source: 'assembly_ai', speaker: 'S1', turn: 1 },
            { word: 'jumps', type: 'ctm', start: 1.5, end: 1.8, conf: 1.0, punct: 'jumps', source: 'assembly_ai', speaker: 'S1', turn: 1 }
        ];

        // Remove "brown" from middle
        const normalizedText = 'the quick fox jumps';
        // The text "brown" is located in the middle of the string (~10 to ~15).
        const minOffset = 10;
        const maxOffset = 15;

        const result = updatePartialAlignment(
            normalizedText,
            minOffset,
            maxOffset,
            alignments,
            mockUpdateAlignments,
            mockCharToWordIndex
        );

        expect(result.length).toBe(4);
        expect(result.map(a => a.word)).not.toContain('brown');
    });

    it('should handle multiple word insertion', () => {
        const alignments: AlignmentType[] = [
            { word: 'hello',   type: 'ctm', start: 0,   end: 0.3, conf: 1.0, punct: 'hello',   source: 'assembly_ai', speaker: 'S1', turn: 1 },
            { word: 'world',   type: 'ctm', start: 0.4, end: 0.7, conf: 1.0, punct: 'world',   source: 'assembly_ai', speaker: 'S1', turn: 1 },
        ];

        // Insert two words between 'hello' and 'world'
        const normalizedText = 'hello amazing new world';
        // Approx offset covering “amazing new” insertion.
        const minOffset = 6; 
        const maxOffset = 18;

        const result = updatePartialAlignment(
            normalizedText,
            minOffset,
            maxOffset,
            alignments,
            mockUpdateAlignments,
            mockCharToWordIndex
        );

        expect(result.length).toBe(4);
        expect(result[1].word).toBe('amazing');
        expect(result[2].word).toBe('new');
        expect(result[1].type).toBe('edit');
        expect(result[2].type).toBe('edit');
    });

    it('should handle case changes (lowercase to uppercase)', () => {
        const alignments: AlignmentType[] = [
            { word: 'hello', type: 'ctm', start: 0,   end: 0.3, conf: 1.0, punct: 'hello', source: 'assembly_ai', speaker: 'S1', turn: 1 },
            { word: 'world', type: 'ctm', start: 0.4, end: 0.7, conf: 1.0, punct: 'world', source: 'assembly_ai', speaker: 'S1', turn: 1 },
        ];

        // Change 'hello world' to 'HELLO WORLD'
        const normalizedText = 'HELLO WORLD';
        // Whole text changed in case, so minOffset=0, maxOffset = length of text
        const minOffset = 0; 
        const maxOffset = normalizedText.length;

        const result = updatePartialAlignment(
            normalizedText,
            minOffset,
            maxOffset,
            alignments,
            mockUpdateAlignments,
            mockCharToWordIndex
        );

        expect(result.map(a => a.word)).toEqual(['HELLO', 'WORLD']);
        // They might still be 'ctm' if the algo sees them as "unchanged words"
        // But because of the mock process function, we can check type
        // if the update logic treats different case as changed
        expect(result[0].type).toBe('edit'); 
        expect(result[1].type).toBe('edit');
    });
});
