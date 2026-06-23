'use client'

import { useState } from 'react'
import { ImageLightbox } from './ImageLightbox'

interface Props {
  images: string[]
  title: string
}

export function ListingGallery({ images, title }: Props) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [failed, setFailed] = useState<Set<string>>(new Set())
  const onError = (src: string) => setFailed(prev => new Set(prev).add(src))
  const validImages = images.filter(src => !failed.has(src))

  if (validImages.length === 0) return (
    <div className="rounded-xl bg-[#f0f0f0] h-[200px] flex flex-col items-center justify-center gap-2 mb-6 text-[#bbb]">
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
      </svg>
      <span className="text-sm italic">Brak zdjęć</span>
    </div>
  )

  return (
    <>
      <div className="grid grid-cols-3 gap-1 rounded-xl overflow-hidden mb-6 h-[440px]">
        {/* Main image */}
        <div
          className="col-span-2 relative bg-black cursor-zoom-in overflow-hidden"
          onClick={() => setLightboxIndex(0)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={validImages[0]}
            alt={title}
            className="absolute inset-0 w-full h-full object-contain hover:scale-[1.02] transition-transform duration-300"
            onError={() => onError(validImages[0])}
          />
        </div>

        {/* Right column thumbnails */}
        <div className="grid grid-rows-2 gap-1">
          {validImages[1] && (
            <div
              className="relative bg-black cursor-zoom-in overflow-hidden"
              onClick={() => setLightboxIndex(1)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={validImages[1]}
                alt=""
                className="absolute inset-0 w-full h-full object-contain hover:scale-[1.02] transition-transform duration-300"
                onError={() => onError(validImages[1])}
              />
            </div>
          )}
          {validImages[2] && (
            <div
              className="relative bg-black cursor-zoom-in overflow-hidden"
              onClick={() => setLightboxIndex(2)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={validImages[2]}
                alt=""
                className="absolute inset-0 w-full h-full object-contain hover:scale-[1.02] transition-transform duration-300"
                onError={() => onError(validImages[2])}
              />
              {validImages.length > 3 && (
                <div className="absolute inset-0 bg-black/45 flex items-center justify-center text-white font-semibold text-base pointer-events-none">
                  +{validImages.length - 3} zdjęć
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {lightboxIndex !== null && (
        <ImageLightbox
          images={validImages}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  )
}
