import React from 'react'

import { DIFF_INSERT, DIFF_DELETE, DmpDiff } from '@/utils/transcript/diff_match_patch'

interface DiffComponentProps {
  diffOutput: DmpDiff[]
}

const Diff: React.FC<DiffComponentProps> = ({ diffOutput }) => {
  // New keydown handler to catch ctrl+A and select only this container's content
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.ctrlKey && event.key === 'a') {
      event.preventDefault()
      const selection = window.getSelection()
      const container = event.currentTarget
      if (selection) {
        const range = document.createRange()
        range.selectNodeContents(container)
        selection.removeAllRanges()
        selection.addRange(range)
      }
    }
  }

  return (
    <div className="diff" tabIndex={0} onKeyDown={handleKeyDown}>
      {diffOutput.map((part, index) => {
        const [op, text] = part
        
        if (op === DIFF_INSERT) {
          return <ins key={index} className="added">{text}</ins>
        } else if (op === DIFF_DELETE) {
          return <del key={index} className="removed">{text}</del>
        }

        return <span key={index}>{text}</span>
      })}
    </div>
  )
}

export default Diff