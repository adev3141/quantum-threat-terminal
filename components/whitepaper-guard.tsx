'use client'

import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { Badge } from '@/components/ui/badge'

const BLOCKED_META_KEYS = new Set(['a', 'c', 'p', 's', 'u', 'x'])
const WATERMARK_ROWS = Array.from({ length: 6 }, (_, index) => index)
const WATERMARK_COLS = Array.from({ length: 4 }, (_, index) => index)

export function WhitepaperGuard({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const noticeTimeoutRef = useRef<number | null>(null)
  const [notice, setNotice] = useState('Protected view')

  useEffect(() => {
    const root = rootRef.current
    if (!root) {
      return
    }

    root.classList.add('whitepaper-protected')

    const showNotice = (message: string) => {
      setNotice(message)
      if (noticeTimeoutRef.current !== null) {
        window.clearTimeout(noticeTimeoutRef.current)
      }
      noticeTimeoutRef.current = window.setTimeout(() => {
        setNotice('Protected view')
      }, 1800)
    }

    const blockEvent = (event: Event, message: string) => {
      event.preventDefault()
      event.stopPropagation()
      showNotice(message)
    }

    const handleContextMenu = (event: MouseEvent) => blockEvent(event, 'Context menu blocked')
    const handleCopy = (event: ClipboardEvent) => blockEvent(event, 'Copy blocked')
    const handleCut = (event: ClipboardEvent) => blockEvent(event, 'Cut blocked')
    const handleDragStart = (event: DragEvent) => blockEvent(event, 'Drag blocked')
    const handleSelectStart = (event: Event) => blockEvent(event, 'Selection blocked')
    const handleBeforePrint = () => showNotice('Printing blocked')
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()

      if ((event.metaKey || event.ctrlKey) && BLOCKED_META_KEYS.has(key)) {
        blockEvent(event, 'Shortcut blocked')
        return
      }

      if (key === 'printscreen') {
        blockEvent(event, 'Browser capture blocked')
      }
    }

    document.addEventListener('contextmenu', handleContextMenu, true)
    document.addEventListener('copy', handleCopy, true)
    document.addEventListener('cut', handleCut, true)
    document.addEventListener('dragstart', handleDragStart, true)
    document.addEventListener('selectstart', handleSelectStart, true)
    document.addEventListener('keydown', handleKeyDown, true)
    window.addEventListener('beforeprint', handleBeforePrint)

    return () => {
      root.classList.remove('whitepaper-protected')

      document.removeEventListener('contextmenu', handleContextMenu, true)
      document.removeEventListener('copy', handleCopy, true)
      document.removeEventListener('cut', handleCut, true)
      document.removeEventListener('dragstart', handleDragStart, true)
      document.removeEventListener('selectstart', handleSelectStart, true)
      document.removeEventListener('keydown', handleKeyDown, true)
      window.removeEventListener('beforeprint', handleBeforePrint)

      if (noticeTimeoutRef.current !== null) {
        window.clearTimeout(noticeTimeoutRef.current)
      }
    }
  }, [])

  return (
    <div ref={rootRef} data-whitepaper-protected-root className="relative">
      {children}

      <div aria-hidden className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
        {WATERMARK_ROWS.map((row) => (
          <div
            key={row}
            className="absolute inset-x-[-12%] flex justify-between -rotate-[22deg]"
            style={{ top: `${6 + row * 17}%` }}
          >
            {WATERMARK_COLS.map((col) => (
              <span
                key={`${row}-${col}`}
                className="font-mono text-[10px] tracking-[0.38em] text-cyan-200/10"
              >
                XQBTS WHITEPAPER // VIEW ONLY
              </span>
            ))}
          </div>
        ))}
      </div>

      <div className="pointer-events-none fixed bottom-4 right-4 z-[70]">
        <Badge variant="outline" className="border-amber-700 bg-black/80 text-amber-300 backdrop-blur-sm">
          {notice}
        </Badge>
      </div>
    </div>
  )
}
