'use client'

import { useEffect, useState, useCallback } from 'react'

interface Props {
  images: string[]
  initialIndex: number
  onClose: () => void
}

export function ImageLightbox({ images, initialIndex, onClose }: Props) {
  const [index, setIndex] = useState(initialIndex)

  const prev = useCallback(() => setIndex(i => (i - 1 + images.length) % images.length), [images.length])
  const next = useCallback(() => setIndex(i => (i + 1) % images.length), [images.length])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, prev, next])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/92 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Close */}
      <button
        className="absolute top-4 right-4 text-white/70 hover:text-white text-3xl leading-none z-10"
        onClick={onClose}
        aria-label="Zamknij"
      >
        ✕
      </button>

      {/* Counter */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/60 text-sm">
        {index + 1} / {images.length}
      </div>

      {/* Prev */}
      {images.length > 1 && (
        <button
          className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center text-xl transition-colors z-10"
          onClick={e => { e.stopPropagation(); prev() }}
          aria-label="Poprzednie"
        >
          ‹
        </button>
      )}

      {/* Image */}
      <div className="max-w-[90vw] max-h-[88vh] flex items-center justify-center" onClick={e => e.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={images[index]}
          alt=""
          className="max-w-full max-h-[88vh] object-contain rounded-lg select-none"
          draggable={false}
        />
      </div>

      {/* Next */}
      {images.length > 1 && (
        <button
          className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center text-xl transition-colors z-10"
          onClick={e => { e.stopPropagation(); next() }}
          aria-label="Następne"
        >
          ›
        </button>
      )}

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 max-w-[90vw] overflow-x-auto px-2 py-1">
          {images.map((src, i) => (
            <button
              key={i}
              onClick={e => { e.stopPropagation(); setIndex(i) }}
              className={`shrink-0 w-14 h-10 rounded overflow-hidden border-2 transition-colors ${i === index ? 'border-[#00C97A]' : 'border-transparent opacity-60 hover:opacity-100'}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
