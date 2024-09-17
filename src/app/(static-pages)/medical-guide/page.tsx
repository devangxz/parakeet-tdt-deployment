// `app/page.tsx` is the UI for the `/` URL
'use client'
export default function Page() {
  return (
    <div className='w-[80%] mx-[10%] m-auto relative space-y-[2rem]'>
      {/* Adjust the sidebar container styles */}
      <h1 className='text-black font-semibold text-4xl mx-auto text-center'>
        <span className='font-semibold'>Medical Guide</span>
      </h1>
      <iframe
        src='https://drive.google.com/file/d/1gwfyYqyzVrfMmneyvdmg6LsE3UpZmnG9/preview'
        width='640'
        height='1000'
        className='embed-responsive-item  mx-auto'
      ></iframe>
    </div>
  )
}
