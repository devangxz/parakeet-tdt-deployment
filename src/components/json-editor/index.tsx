import JSONEditor, { JSONEditorOptions } from 'jsoneditor'
import React, { useEffect, useRef } from 'react'
import 'jsoneditor/dist/jsoneditor.css'

interface JSONEditorDemoProps {
  json: object
  onChangeJSON: (json: object) => void
}

const JsonEditor = ({ json, onChangeJSON }: JSONEditorDemoProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const jsonEditorRef = useRef<JSONEditor | null>(null)

  useEffect(() => {
    const options: JSONEditorOptions = {
      mode: 'tree',
      onChangeJSON,
    }

    if (containerRef.current) {
      jsonEditorRef.current = new JSONEditor(containerRef.current, options)
      jsonEditorRef.current.set(json)
    }

    return () => {
      if (jsonEditorRef.current) {
        jsonEditorRef.current.destroy()
      }
    }
  }, [])

  useEffect(() => {
    if (jsonEditorRef.current) {
      jsonEditorRef.current.update(json)
    }
  }, [json])

  return <div className='jsoneditor-react-container' ref={containerRef} />
}

export default JsonEditor
