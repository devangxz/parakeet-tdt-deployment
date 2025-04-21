import { CTMType, AlignmentType } from '@/types/editor'
import {
  diff_match_patch,
  DIFF_DELETE,
  DIFF_INSERT,
} from '@/utils/transcript/diff_match_patch'

export function findMatchingBoundary(
  newWords: string[],
  alignments: AlignmentType[],
  endIdx: number
): number {
  // Search backwards from end to find last matching occurrence
  const lastTwoNew = newWords.slice(-2).join(' ')
  console.log('Finding boundary match for:', lastTwoNew)

  let searchIdx = Math.min(alignments.length - 1, endIdx + 1)
  console.log('Starting search at index:', searchIdx)

  while (searchIdx > 1) {
    const lastTwoOld = alignments
      .slice(searchIdx - 1, searchIdx + 1)
      .map((a) => a.word)
      .join(' ')
    console.log('Comparing with:', lastTwoOld, 'at index:', searchIdx)

    if (lastTwoOld === lastTwoNew) {
      console.log('Found matching boundary at index:', searchIdx)
      break
    }
    searchIdx--
  }

  console.log('Final boundary index:', searchIdx)
  return searchIdx
}

export function updatePartialAlignment(
  text: string,
  minOffset: number,
  maxOffset: number,
  alignments: AlignmentType[],
  updateAlignments: (
    newText: string,
    currentAlignments: AlignmentType[]
  ) => AlignmentType[],
  characterIndexToWordIndex: (text: string, charIndex: number) => number
): AlignmentType[] {
  const newWords = text.split(/\s+/).filter(Boolean)

  let startIndex = characterIndexToWordIndex(text, minOffset) - 2
  if (startIndex < 0) startIndex = 0
  console.log('start index:', startIndex)

  let endIndex = characterIndexToWordIndex(text, maxOffset) + 2
  if (endIndex >= newWords.length) {
    endIndex = newWords.length - 1
  }
  console.log('end index:', endIndex)

  // Start search near end position to find correct word boundary
  const oldEndIndex = findMatchingBoundary(
    newWords.slice(startIndex, endIndex + 1),
    alignments,
    endIndex + 2
  )

  const changedWords = newWords.slice(startIndex, endIndex + 1).join(' ')
  const affectedAlignments = alignments.slice(startIndex, oldEndIndex + 1)

  console.log('Changed Words:', changedWords)
  console.log(
    'Affected Alignments:',
    affectedAlignments.map((a) => a.word).join(' ')
  )

  const updatedSlice = updateAlignments(changedWords, affectedAlignments)

  return [
    ...alignments.slice(0, startIndex),
    ...updatedSlice,
    ...alignments.slice(oldEndIndex + 1),
  ]
}

export function getAlignmentIndexByTime(
  alignments: AlignmentType[],
  time: number,
  lastIndex: number | null
): number {
  if (alignments.length === 0) return 0

  // Find next non-meta index (includes current index)
  const findNextNonMeta = (index: number) => {
    while (index < alignments.length && alignments[index].type === 'meta') {
      index++
    }
    return index < alignments.length ? index : null
  }

  // Find previous non-meta index
  const findPrevNonMeta = (index: number) => {
    while (index >= 0 && alignments[index].type === 'meta') {
      index--
    }
    return index >= 0 ? index : null
  }

  // Sequential play optimization
  if (lastIndex !== null) {
    // If last index was meta, find next non-meta
    if (alignments[lastIndex].type === 'meta') {
      lastIndex = findNextNonMeta(lastIndex)
      if (lastIndex === null) return alignments.length - 1
    }

    const lastWord = alignments[lastIndex]

    // Still in current word
    if (time >= lastWord.start && time < lastWord.end) {
      return lastIndex
    }

    // Moving forward
    if (time >= lastWord.end) {
      const nextIndex = findNextNonMeta(lastIndex + 1)
      if (nextIndex !== null) {
        const nextWord = alignments[nextIndex]

        // In gap between words
        if (time < nextWord.start) {
          const timeToLastEnd = time - lastWord.end
          const timeToNextStart = nextWord.start - time
          return timeToLastEnd < timeToNextStart ? lastIndex : nextIndex
        }

        // Within next word
        if (time < nextWord.end) {
          return nextIndex
        }
      }
    } else {
      // Moving backward
      const prevIndex = findPrevNonMeta(lastIndex - 1)
      if (prevIndex !== null) {
        const prevWord = alignments[prevIndex]
        if (time >= prevWord.start && time < prevWord.end) {
          return prevIndex
        }
      }
    }
  }

  // Binary search
  let low = 0
  let high = alignments.length - 1

  while (low <= high) {
    const mid = (low + high) >> 1
    // Skip meta entries in binary search
    const currentIndex = findNextNonMeta(mid)
    if (currentIndex === null) {
      high = mid - 1
      continue
    }

    const word = alignments[currentIndex]

    if (time >= word.start && time < word.end) {
      return currentIndex
    }

    const prevIndex = findPrevNonMeta(currentIndex - 1)
    if (prevIndex !== null) {
      const prevWord = alignments[prevIndex]
      if (time >= prevWord.end && time < word.start) {
        const prevDistance = time - prevWord.end
        const nextDistance = word.start - time
        return prevDistance < nextDistance ? prevIndex : currentIndex
      }
    }

    if (time < word.start) {
      high = mid - 1
    } else {
      low = mid + 1
    }
  }

  // Edge cases - find first/last non-meta entries
  const firstNonMetaIndex = findNextNonMeta(0)
  if (
    firstNonMetaIndex !== null &&
    time < alignments[firstNonMetaIndex].start
  ) {
    return firstNonMetaIndex
  }

  const finalWordIndex = findPrevNonMeta(alignments.length - 1)
  if (finalWordIndex !== null) {
    return finalWordIndex
  }

  return 0
}

export function createAlignments(
  text: string,
  ctms: CTMType[]
): AlignmentType[] {
  const words = text.split(/\s+/)
  const alignments: AlignmentType[] = []
  let ctmIndex = 0

  for (let i = 0; i < words.length; i++) {
    const word = words[i]

    if (
      ctmIndex < ctms.length &&
      (word.toLowerCase() === ctms[ctmIndex].word.toLowerCase() ||
        word.toLowerCase() === ctms[ctmIndex].punct.toLowerCase())
    ) {
      alignments.push({
        ...ctms[ctmIndex],
        word: word,
        type: 'ctm',
      })
      ctmIndex++
    } else {
      const referenceCTM =
        ctmIndex < ctms.length ? ctms[ctmIndex] : ctms[ctms.length - 1]
      alignments.push({
        word: word,
        type: 'meta',
        start: referenceCTM.start,
        end: referenceCTM.end,
        conf: 1.0,
        punct: word,
        source: 'meta',
        speaker: referenceCTM.speaker,
        turn: referenceCTM.turn,
      })
    }
  }

  return alignments
}

function processMetaPhrase(text: string): string[] {
  text = text.trim()

  if (/^\d:\d{2}:\d{2}\.\d$/.test(text) || /^S\d+:$/.test(text)) {
    return [text]
  }

  if (text.startsWith('[') && text.endsWith(']')) {
    const words = text.slice(1, -1).split(/\s+/)
    if (words.length === 1) {
      return [`[${words[0]}]`]
    }
    return [
      `[${words[0]}`,
      ...words.slice(1, -1),
      `${words[words.length - 1]}]`,
    ]
  }

  return text.split(/\s+/)
}

const isPunctuation = (word: string) => /^[.,!?;:]$/.test(word)

const isMetaContent = (word: string) =>
  /^\d:\d{2}:\d{2}\.\d$/.test(word) || // Timestamp
  /^S\d+:$/.test(word) || // Speaker label
  /^\[.*\]$/.test(word) || // Single bracketed word
  word.startsWith('[') || // Start of bracketed phrase
  word.endsWith(']') // End of bracketed phrase

function tokenizeWithOffsets(rawText: string) {
  const tokens = []
  let currentPos = 0

  // Match either:
  // - Complete meta phrase [...] to be split later
  // - Single non-whitespace characters
  const segments = rawText.match(/\[([^\]]*)\]|\S+/g) || []

  for (const segment of segments) {
    // Skip whitespace
    while (currentPos < rawText.length && /\s/.test(rawText[currentPos])) {
      currentPos++
    }

    // For meta phrases, split into multiple tokens
    if (segment.startsWith('[') && segment.endsWith(']')) {
      const words = segment.slice(1, -1).split(/\s+/)
      const startBracketPos = currentPos

      // First word with opening bracket
      tokens.push({
        word: `[${words[0]}`,
        startPos: startBracketPos,
        endPos: startBracketPos + words[0].length + 1,
      })

      // Middle words (if any)
      let wordPos = startBracketPos + words[0].length + 1
      for (let i = 1; i < words.length - 1; i++) {
        wordPos++ // Skip space
        tokens.push({
          word: words[i],
          startPos: wordPos,
          endPos: wordPos + words[i].length,
        })
        wordPos += words[i].length
      }

      // Last word with closing bracket
      if (words.length > 1) {
        wordPos++ // Skip space
        tokens.push({
          word: `${words[words.length - 1]}]`,
          startPos: wordPos,
          endPos: wordPos + words[words.length - 1].length + 1,
        })
      }

      currentPos = startBracketPos + segment.length
      continue
    }

    // Normal word
    tokens.push({
      word: segment,
      startPos: currentPos,
      endPos: currentPos + segment.length,
    })
    currentPos += segment.length
  }
  return tokens
}

function markExactMatches(alignments: AlignmentType[], ctms: CTMType[]) {
  let ctmIndex = 0
  let alignIndex = 0

  while (ctmIndex < ctms.length && alignIndex < alignments.length) {
    const ctm = ctms[ctmIndex]
    const alignment = alignments[alignIndex]

    // Skip meta
    if (alignment.type !== 'ctm') {
      alignIndex++
      continue
    }

    // Exact matching by start/end
    if (ctm.start === alignment.start && ctm.end === alignment.end) {
      const isWordMatch =
        ctm.punct.toLowerCase() === alignment.word.toLowerCase()

      alignments[alignIndex] = {
        ...alignment,
        ctmIndex,
        case: isWordMatch ? 'success' : 'mismatch',
      }
      ctmIndex++
      alignIndex++
    } else if (alignment.start < ctm.start) {
      alignments[alignIndex] = {
        ...alignment,
        ctmIndex: -1,
        case: 'mismatch',
      }
      alignIndex++
    } else {
      ctmIndex++
    }
  }

  while (alignIndex < alignments.length) {
    const alignment = alignments[alignIndex]
    if (alignment.type === 'ctm') {
      alignments[alignIndex] = {
        ...alignment,
        ctmIndex: -1,
        case: 'mismatch',
      }
    }
    alignIndex++
  }

  return alignments
}

export function updateAlignments(
  newText: string,
  currentAlignments: AlignmentType[],
  ctms: CTMType[]
) {
  if (!currentAlignments.length) return []

  // Build word array + positions from the new text
  const newTokens = tokenizeWithOffsets(newText)
  const newWords = newTokens.map((t) => t.word)
  // For diffing, join by space so we match the old approach
  const newJoined = newWords.join(' ')

  // Old text is the alignment's words joined by space
  const oldWords = currentAlignments.map((a) => a.word)
  const oldJoined = oldWords.join(' ')

  // Perform the diff
  const dmp = new diff_match_patch()
  const rawDiffs = dmp.diff_wordMode(oldJoined, newJoined)
  const diffs = rawDiffs.map(([op, text]) => {
    if (op === DIFF_DELETE) return { type: 'removed', value: text }
    if (op === DIFF_INSERT) return { type: 'added', value: text }
    return { type: 'unchanged', value: text }
  })

  // Reconstruct new Alignments
  const newAlignments: AlignmentType[] = []
  let alignmentIndex = 0 // old alignment pointer
  let newTokenIndex = 0 // newTokens pointer
  let lastRemovedAlignment: AlignmentType | null = null

  diffs.forEach((part) => {
    const { type, value } = part

    /**
     * Break the diff "value" into words (accounting for bracketed phrases) again
     * so we know how many tokens to skip forward.
     */
    const segmentWords = value.trim()
      ? value
          .trim()
          .match(/\[.*?\]|\S+/g)
          ?.reduce<string[]>(
            (words, segment) => [...words, ...processMetaPhrase(segment)],
            []
          ) || []
      : []

    if (type === 'removed') {
      // Mark the removed words in old alignments
      lastRemovedAlignment =
        segmentWords.length === 1 ? currentAlignments[alignmentIndex] : null
      alignmentIndex += segmentWords.length
    } else if (type === 'added') {
      const isReplacement = lastRemovedAlignment && segmentWords.length === 1

      if (isReplacement) {
        // Replacement: keep the old alignment's timing but new text
        // Also update its new char offsets
        const { startPos, endPos } = newTokens[newTokenIndex]
        const isMetaOrPunct =
          isMetaContent(segmentWords[0]) || isPunctuation(segmentWords[0])

        const replaced: AlignmentType = {
          ...lastRemovedAlignment!,
          word: segmentWords[0],
          punct: segmentWords[0],
          source: isMetaOrPunct ? 'meta' : 'user',
          type: isMetaOrPunct ? 'meta' : 'ctm',
          start: lastRemovedAlignment!.start,
          end: lastRemovedAlignment!.end,
          conf: lastRemovedAlignment!.conf,
          speaker: lastRemovedAlignment!.speaker,
          startPos: startPos,
          endPos: endPos,
        }
        newAlignments.push(replaced)
        newTokenIndex++
      } else {
        // Inserted words
        const prevAlignment =
          alignmentIndex > 0 ? currentAlignments[alignmentIndex - 1] : null
        const nextAlignment =
          currentAlignments[alignmentIndex] ||
          currentAlignments[currentAlignments.length - 1]

        segmentWords.forEach((word: string, idx: number) => {
          // Insert meta or punctuation
          if (isMetaContent(word) || isPunctuation(word)) {
            // Find next non-meta alignment's start time
            let nextStartTime = nextAlignment?.start
            for (let i = alignmentIndex; i < currentAlignments.length; i++) {
              const align = currentAlignments[i]
              if (align.type !== 'meta') {
                nextStartTime = align.start
                break
              }
            }

            const { startPos, endPos } = newTokens[newTokenIndex]
            newAlignments.push({
              word,
              type: 'meta',
              start: nextStartTime || 0,
              end: nextStartTime || 0,
              conf: 1.0,
              punct: word,
              source: 'meta',
              speaker: nextAlignment.speaker,
              turn: nextAlignment.turn,
              startPos: startPos,
              endPos: endPos,
            })
            newTokenIndex++
          } else {
            // Insert a brand-new word with approximate time
            const { startPos, endPos } = newTokens[newTokenIndex]
            newTokenIndex++

            let start, end
            if (!prevAlignment) {
              start = nextAlignment.start - (segmentWords.length - idx) * 0.01
              end = start + 0.01
            } else if (!nextAlignment) {
              start = prevAlignment.end + idx * 0.01
              end = start + 0.01
            } else {
              const timeGap = nextAlignment.start - prevAlignment.end
              const wordDuration = timeGap / (segmentWords.length + 1)
              start = prevAlignment.end + wordDuration * (idx + 1)
              end = start + 0.01
            }

            newAlignments.push({
              word,
              type: 'ctm',
              start: Number(start.toFixed(3)),
              end: Number(end.toFixed(3)),
              conf: 1.0,
              punct: word,
              source: 'user',
              speaker: nextAlignment.speaker,
              turn: nextAlignment.turn,
              startPos: startPos,
              endPos: endPos,
            })
          }
        })
      }
      lastRemovedAlignment = null
    } else {
      // Unchanged
      segmentWords.forEach(() => {
        const oldAl = currentAlignments[alignmentIndex]
        alignmentIndex++

        // This old alignment's word now corresponds to newTokens[newTokenIndex]
        const { startPos, endPos } = newTokens[newTokenIndex]
        newTokenIndex++

        newAlignments.push({
          ...oldAl,
          startPos: startPos,
          endPos: endPos,
        })
      })
    }
  })

  return markExactMatches(newAlignments, ctms)
}
