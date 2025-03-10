import { useState } from 'react'

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

const QCLink = ({
  user,
}: {
  user: { name: string; email: string; id: string }
}) => {
  const [open, setOpen] = useState(false)
  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger asChild>
        <a
          onClick={(e) => {
            e.preventDefault()
            setOpen(!open)
          }}
          className='cursor-pointer underline text-blue-500'
        >
          {user.name}
        </a>
      </TooltipTrigger>
      <TooltipContent side='bottom'>
        <div>
          <div>ID: {user.id}</div>
          <div>Email: {user.email}</div>
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

export default QCLink
