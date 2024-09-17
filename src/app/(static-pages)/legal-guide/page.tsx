// `app/page.tsx` is the UI for the `/` URL
'use client'

export default function Page() {
  return (
    <div className='w-[80%] mx-[10%] m-auto relative space-y-[2rem]'>
      {/* Adjust the sidebar container styles */}
      <h1 className='text-black font-semibold text-4xl mx-auto text-center'>
        <span className='font-semibold'>Legal Guide</span>
      </h1>
      <iframe
        src='https://drive.google.com/file/d/1D-XoK8bPqhHffjEi2iP0ua6lG65vWlbM/preview'
        width='640'
        height='1000'
        className='embed-responsive-item  mx-auto'
      ></iframe>
    </div>
  )
}
