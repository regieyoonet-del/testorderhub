import React, { useState } from 'react';
import { Product, CatalogProduct } from '../types';
import { ChevronLeft, ChevronRight, Heart } from 'lucide-react';

interface ProductImageCarouselProps {
  product: Product | CatalogProduct | {
    id: string;
    name: string;
    imageUrl: string;
    imageUrls?: string[];
    frequentlyOrdered?: boolean;
    [key: string]: any;
  };
  onImageClick?: () => void;
  favorites?: Record<string, boolean>;
  onToggleFavorite?: (productId: string, e: React.MouseEvent) => void;
  showFavoriteButton?: boolean;
  aspectClass?: string;
  className?: string;
  imageFit?: 'contain' | 'cover';
}

export default function ProductImageCarousel({
  product,
  onImageClick,
  favorites,
  onToggleFavorite,
  showFavoriteButton = true,
  aspectClass = "aspect-square",
  className = "",
  imageFit = "contain"
}: ProductImageCarouselProps) {
  const images = Array.from(new Set([product.imageUrl, ...(product.imageUrls || [])].filter(Boolean)));
  const [activeIdx, setActiveIdx] = useState<number>(0);

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveIdx((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveIdx((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const currentImage = images[activeIdx] || product.imageUrl;

  return (
    <div
      onClick={onImageClick}
      className={`bg-[#edf0f3] rounded-[22px] relative flex items-center justify-center overflow-hidden transition-all group-hover:bg-[#e4e7ea] cursor-pointer ${aspectClass} ${className}`}
    >
      {currentImage && currentImage.startsWith('http') ? (
        <img
          src={currentImage}
          alt={product.name}
          className={`w-full h-full ${imageFit === 'contain' ? 'object-contain p-2' : 'object-cover'} transition-transform duration-500 group-hover:scale-102`}
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="text-5xl select-none">{currentImage || '📦'}</div>
      )}

      {/* Popular / Best-Seller Badge */}
      {(product as any).frequentlyOrdered && (
        <span className="absolute top-3 left-3 bg-black text-white text-[9px] font-mono font-bold tracking-widest px-2.5 py-0.5 rounded-full uppercase z-10 shadow-sm">
          B2B Best-Seller
        </span>
      )}

      {/* Favorite Heart Button */}
      {showFavoriteButton && onToggleFavorite && (
        <button
          onClick={(e) => onToggleFavorite(product.id, e)}
          className="absolute top-3 right-3 bg-white hover:bg-neutral-50 rounded-full p-2 shadow-md hover:scale-110 active:scale-95 transition-transform cursor-pointer z-10 flex items-center justify-center border border-gray-100"
          aria-label="Toggle Favorite"
          id={`fav-btn-${product.id}`}
        >
          <Heart
            className={`w-4 h-4 transition-colors ${
              favorites && favorites[product.id]
                ? 'fill-red-500 text-red-500'
                : 'text-gray-400 group-hover:text-gray-600'
            }`}
          />
        </button>
      )}

      {/* Carousel Next / Prev Controls */}
      {images.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black text-white p-1.5 rounded-full z-20 transition-all opacity-90 sm:opacity-0 group-hover:opacity-100 shadow-md hover:scale-110 active:scale-90 cursor-pointer"
            aria-label="Previous image"
            id={`carousel-prev-${product.id}`}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            onClick={handleNext}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black text-white p-1.5 rounded-full z-20 transition-all opacity-90 sm:opacity-0 group-hover:opacity-100 shadow-md hover:scale-110 active:scale-90 cursor-pointer"
            aria-label="Next image"
            id={`carousel-next-${product.id}`}
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Pagination Dots */}
          <div className="absolute bottom-3 left-0 right-0 flex justify-center items-center gap-1.5 z-20 px-2">
            {images.map((_, idx) => (
              <button
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveIdx(idx);
                }}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  idx === activeIdx
                    ? 'w-5 bg-black shadow-sm'
                    : 'w-1.5 bg-gray-400/70 hover:bg-gray-600'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
