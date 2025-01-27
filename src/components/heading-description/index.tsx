interface HeadingDescriptionProps {
  heading: string
  description?: string
}

export default function HeadingDescription(props: HeadingDescriptionProps) {
  const { heading, description } = props
  return (
    <div className='space-y-1'>
      <div className='text-lg font-semibold md:text-xl'>{heading}</div>
      {description?.length && (
        <div className='text-gray-600 text-sm not-italic font-normal leading-6'>
          {description}
        </div>
      )}{' '}
    </div>
  )
}
