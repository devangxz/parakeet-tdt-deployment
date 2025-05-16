// diff_match_patch.d.ts
declare module '@/utils/transcript/diff_match_patch' {
  export const DIFF_DELETE: number;
  export const DIFF_INSERT: number;
  export const DIFF_EQUAL: number;

  export type DmpDiff = [number, string];

  export class diff_match_patch {
    Diff_Timeout: number;
    Diff_EditCost: number;
    // etc. Fill in whatever else you use.

    diff_main(text1: string, text2: string, opt_checklines?: boolean, opt_deadline?: number): DmpDiff[];
    diff_wordMode(text1: string, text2: string): DmpDiff[];
    diff_cleanupEfficiency(diffs: DmpDiff[]): void;
    diff_cleanupSemantic(diffs: DmpDiff[]): void;
    diff_levenshtein(diffs: DmpDiff[]): number;
  }

  export default diff_match_patch;
}
