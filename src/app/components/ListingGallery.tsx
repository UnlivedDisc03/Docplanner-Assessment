'use client'

import { useState } from 'react'
import { ImageLightbox } from './ImageLightbox'

interface Props {
  images: string[]
  title: string
}

export function ListingGallery({ images, title }: Props) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  if (images.length === 0) return null

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
            src={images[0]}
            alt={title}
            className="absolute inset-0 w-full h-full object-contain hover:scale-[1.02] transition-transform duration-300"
          />
        </div>

        {/* Right column thumbnails */}
        <div className="grid grid-rows-2 gap-1">
          {images[1] && (
            <div
              className="relative bg-black cursor-zoom-in overflow-hidden"
              onClick={() => setLightboxIndex(1)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={images[1]}
                alt=""
                className="absolute inset-0 w-full h-full object-contain hover:scale-[1.02] transition-transform duration-300"
              />
            </div>
          )}
          {images[2] && (
            <div
              className="relative bg-black cursor-zoom-in overflow-hidden"
              onClick={() => setLightboxIndex(2)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={images[2]}
                alt=""
                className="absolute inset-0 w-full h-full object-contain hover:scale-[1.02] transition-transform duration-300"
              />
              {images.length > 3 && (
                <div className="absolute inset-0 bg-black/45 flex items-center justify-center text-white font-semibold text-base pointer-events-none">
                  +{images.length - 3} zdjęć
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {lightboxIndex !== null && (
        <ImageLightbox
          images={images}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  )
}
