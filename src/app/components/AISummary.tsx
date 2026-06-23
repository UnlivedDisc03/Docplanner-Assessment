import type { Listing } from '@/domain/listing/Listing'

export function AISummary({ listing }: { listing: Listing }) {
  if (!listing.aiSummary) return null

  return (
    <div className="bg-gradient-to-br from-[#f0fdf8] to-[#f5fffc] border border-[#00C97A]/30 rounded-xl p-4 mb-5">
      <div className="flex items-center gap-1.5 mb-2">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="#00C97A" stroke="none">
          <path d="M12 2l2.09 6.26L20 10l-5.91 1.74L12 18l-2.09-6.26L4 10l5.91-1.74z"/>
          <path d="M19 2l.94 2.06L22 5l-2.06.94L19 8l-.94-2.06L16 5l2.06-.94z" opacity=".6"/>
        </svg>
        <span className="text-[11px] font-bold text-[#00C97A] uppercase tracking-wider">Podsumowanie AI</span>
      </div>
      <p className="text-sm text-[#444] leading-relaxed">{listing.aiSummary}</p>
    </div>
  )
}
