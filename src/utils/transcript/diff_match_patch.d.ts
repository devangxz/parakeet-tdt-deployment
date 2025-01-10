// diff_match_patch.d.ts
declare module '@/utils/transcript/diff_match_patch' {
  export const DIFF_DELETE: number;
  export const DIFF_INSERT: number;
  export const DIFF_EQUAL: number;

  export class diff_match_patch {
    Diff_Timeout: number;
    Diff_EditCost: number;
    // etc. Fill in whatever else you use.

    diff_main(text1: string, text2: string, opt_checklines?: boolean, opt_deadline?: number): Array<[number, string]>;
    diff_wordMode(text1: string, text2: string): Array<[number, string]>;
  }

  export default diff_match_patch;
}
