import { useEffect, useRef, useState } from 'react'
import { isExternalFileDrag } from '../lib/dnd'

/** Tracks OS file drags over the window and invokes `onDrop` when files are released. */
export function useExternalFileDrop(onDrop: (files: FileList) => void): boolean {
  const [active, setActive] = useState(false)
  const counterRef = useRef(0)
  const onDropRef = useRef(onDrop)
  onDropRef.current = onDrop

  useEffect(() => {
    function onDragEnter(e: DragEvent) {
      if (!isExternalFileDrag(e)) return
      e.preventDefault()
      counterRef.current += 1
      setActive(true)
    }

    function onDragOver(e: DragEvent) {
      if (!isExternalFileDrag(e)) return
      e.preventDefault()
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
    }

    function onDragLeave(e: DragEvent) {
      if (!isExternalFileDrag(e)) return
      counterRef.current -= 1
      if (counterRef.current <= 0) {
        counterRef.current = 0
        setActive(false)
      }
    }

    function onDrop(e: DragEvent) {
      if (!isExternalFileDrag(e)) return
      e.preventDefault()
      counterRef.current = 0
      setActive(false)
      const files = e.dataTransfer?.files
      if (files && files.length > 0) {
        onDropRef.current(files)
      }
    }

    document.addEventListener('dragenter', onDragEnter)
    document.addEventListener('dragover', onDragOver)
    document.addEventListener('dragleave', onDragLeave)
    document.addEventListener('drop', onDrop)
    return () => {
      document.removeEventListener('dragenter', onDragEnter)
      document.removeEventListener('dragover', onDragOver)
      document.removeEventListener('dragleave', onDragLeave)
      document.removeEventListener('drop', onDrop)
    }
  }, [])

  return active
}
