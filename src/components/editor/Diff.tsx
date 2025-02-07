import React from 'react'

import { DIFF_INSERT, DIFF_DELETE, DmpDiff } from '@/utils/transcript/diff_match_patch'

interface DiffComponentProps {
  diffOutput: DmpDiff[]
}

const Diff: React.FC<DiffComponentProps> = ({ diffOutput }) => {
  return (
    <div className="diff">
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