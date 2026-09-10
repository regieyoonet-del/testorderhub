import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';

export interface ProductImageViewerOptions {
  images?: string[];
  src?: string;
  currentIndex?: number;
  title?: string;
  subtitle?: string;
}

interface ProductImageViewerContextType {
  openViewer: (options: ProductImageViewerOptions) => void;
  closeViewer: () => void;
  isOpen: boolean;
}

const ProductImageViewerContext = createContext<ProductImageViewerContextType>({
  openViewer: () => {},
  closeViewer: () => {},
  isOpen: false
});

export const useProductImageViewer = () => useContext(ProductImageViewerContext);

export function ProductImageViewerProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [title, setTitle] = useState<string | undefined>();
  const [subtitle, setSubtitle] = useState<string | undefined>();

  // Zoom and pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const imageRef = useRef<HTMLImageElement | null>(null);

  const resetZoomAndPan = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setIsDragging(false);
  }, []);

  const openViewer = useCallback((options: ProductImageViewerOptions) => {
    let list: string[] = [];
    if (options.images && options.images.length > 0) {
      list = options.images.filter(img => img && typeof img === 'string' && img.startsWith('http'));
    }
    if (list.length === 0 && options.src && typeof options.src === 'string' && options.src.startsWith('http')) {
      list = [options.src];
    }

    if (list.length === 0) {
      return; // Retain placeholder behavior if no valid image exists
    }

    const initialIdx = Math.max(0, Math.min(options.currentIndex || 0, list.length - 1));
    setImages(list);
    setCurrentIndex(initialIdx);
    setTitle(options.title);
    setSubtitle(options.subtitle);
    setIsLoading(true);
    setHasError(false);
    resetZoomAndPan();
    setIsOpen(true);
  }, [resetZoomAndPan]);

  const closeViewer = useCallback(() => {
    setIsOpen(false);
    resetZoomAndPan();
  }, [resetZoomAndPan]);

  const handlePrev = useCallback(() => {
    if (images.length <= 1) return;
    setIsLoading(true);
    setHasError(false);
    resetZoomAndPan();
    setCurrentIndex(prev => (prev === 0 ? images.length - 1 : prev - 1));
  }, [images.length, resetZoomAndPan]);

  const handleNext = useCallback(() => {
    if (images.length <= 1) return;
    setIsLoading(true);
    setHasError(false);
    resetZoomAndPan();
    setCurrentIndex(prev => (prev === images.length - 1 ? 0 : prev + 1));
  }, [images.length, resetZoomAndPan]);

  const handleZoomIn = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setZoom(prev => Math.min(prev + 0.5, 4));
  };

  const handleZoomOut = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setZoom(prev => {
      const next = Math.max(prev - 0.5, 1);
      if (next === 1) setPan({ x: 0, y: 0 });
      return next;
    });
  };

  const handleToggleZoom = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (zoom > 1) {
      resetZoomAndPan();
    } else {
      setZoom(2);
    }
  };

  // Prevent background scroll when viewer is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Keyboard navigation & ESC to close
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeViewer();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        setZoom(prev => Math.min(prev + 0.5, 4));
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        setZoom(prev => {
          const next = Math.max(prev - 0.5, 1);
          if (next === 1) setPan({ x: 0, y: 0 });
          return next;
        });
      } else if (e.key === '0') {
        e.preventDefault();
        resetZoomAndPan();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeViewer, handlePrev, handleNext, resetZoomAndPan]);

  // Mouse pan handlers when zoomed in
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || zoom <= 1) return;
    e.preventDefault();
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const currentImage = images[currentIndex];

  return (
    <ProductImageViewerContext.Provider value={{ openViewer, closeViewer, isOpen }}>
      {children}

      {/* Lightbox Modal */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Product Image Viewer"
          id="global-product-image-viewer"
          className="fixed inset-0 z-[99999] flex flex-col justify-between bg-black/92 backdrop-blur-md transition-opacity duration-200 animate-fade-in select-none"
          onClick={closeViewer}
          onMouseUp={handleMouseUp}
        >
          {/* Top Header Bar */}
          <div
            className="flex items-center justify-between px-4 py-3 sm:px-6 z-20 bg-gradient-to-b from-black/80 to-transparent"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col min-w-0 pr-4">
              {title && (
                <h3 className="text-white text-sm sm:text-base font-extrabold uppercase tracking-tight truncate max-w-md sm:max-w-xl">
                  {title}
                </h3>
              )}
              <div className="flex items-center gap-2 mt-0.5">
                {subtitle && (
                  <span className="text-gray-400 text-xs font-mono uppercase tracking-wider">
                    {subtitle}
                  </span>
                )}
                {images.length > 1 && (
                  <span className="text-gray-300 text-xs font-mono font-bold bg-white/10 px-2 py-0.5 rounded-md">
                    {currentIndex + 1} / {images.length}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Open original in new tab */}
              {currentImage && (
                <a
                  href={currentImage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-gray-200 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                  title="Open original image in new tab"
                  aria-label="Open original image in new tab"
                  id="image-viewer-external-btn"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}

              {/* Close Button */}
              <button
                type="button"
                onClick={closeViewer}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/25 active:bg-white/40 text-white flex items-center justify-center transition-all cursor-pointer shadow-lg hover:scale-105 active:scale-95 border border-white/20"
                aria-label="Close image viewer"
                id="image-viewer-close-btn"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Central Image Viewport */}
          <div
            className="relative flex-1 flex items-center justify-center overflow-hidden px-2 sm:px-12 py-2"
            onClick={closeViewer}
            onMouseMove={handleMouseMove}
          >
            {/* Previous Image Arrow */}
            {images.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrev();
                }}
                className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-30 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center border border-white/20 shadow-xl transition-all hover:scale-110 active:scale-95 cursor-pointer backdrop-blur-xs"
                aria-label="Previous image"
                id="image-viewer-prev-btn"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            {/* Next Image Arrow */}
            {images.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNext();
                }}
                className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-30 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center border border-white/20 shadow-xl transition-all hover:scale-110 active:scale-95 cursor-pointer backdrop-blur-xs"
                aria-label="Next image"
                id="image-viewer-next-btn"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}

            {/* Main Image Container */}
            <div
              className="relative max-w-[92vw] max-h-[76vh] flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              {isLoading && !hasError && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-10 h-10 border-3 border-white/20 border-t-white rounded-full animate-spin" />
                </div>
              )}

              {hasError ? (
                <div className="bg-white/10 rounded-2xl p-8 text-center text-white space-y-2 border border-white/20">
                  <span className="text-4xl block">🖼️</span>
                  <p className="text-sm font-semibold">Image could not be loaded</p>
                  <p className="text-xs text-gray-400 font-mono break-all max-w-md">{currentImage}</p>
                </div>
              ) : (
                <img
                  ref={imageRef}
                  src={currentImage}
                  alt={title || 'Product view'}
                  onLoad={() => setIsLoading(false)}
                  onError={() => {
                    setIsLoading(false);
                    setHasError(true);
                  }}
                  onDoubleClick={handleToggleZoom}
                  onMouseDown={handleMouseDown}
                  referrerPolicy="no-referrer"
                  style={{
                    transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                    cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in',
                    transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.2, 0, 0, 1)'
                  }}
                  className="max-w-[92vw] max-h-[76vh] object-contain rounded-xl shadow-2xl transition-opacity duration-300"
                  id="image-viewer-active-img"
                  draggable={false}
                />
              )}
            </div>
          </div>

          {/* Bottom Controls Bar & Thumbnail Filmstrip */}
          <div
            className="flex flex-col items-center gap-3 px-4 py-3 sm:px-6 z-20 bg-gradient-to-t from-black/90 via-black/70 to-transparent"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Floating Zoom Toolbar */}
            <div className="flex items-center gap-1.5 bg-neutral-900/90 border border-white/20 rounded-full px-3 py-1.5 shadow-2xl backdrop-blur-md">
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={zoom <= 1}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-300 hover:text-white disabled:opacity-30 disabled:hover:text-gray-300 transition-colors cursor-pointer"
                title="Zoom Out (-)"
                aria-label="Zoom Out"
                id="image-viewer-zoom-out-btn"
              >
                <ZoomOut className="w-4 h-4" />
              </button>

              <span className="text-xs font-mono font-bold text-white px-2 min-w-[52px] text-center">
                {Math.round(zoom * 100)}%
              </span>

              <button
                type="button"
                onClick={handleZoomIn}
                disabled={zoom >= 4}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-300 hover:text-white disabled:opacity-30 disabled:hover:text-gray-300 transition-colors cursor-pointer"
                title="Zoom In (+)"
                aria-label="Zoom In"
                id="image-viewer-zoom-in-btn"
              >
                <ZoomIn className="w-4 h-4" />
              </button>

              {zoom !== 1 && (
                <button
                  type="button"
                  onClick={() => resetZoomAndPan()}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-gray-300 hover:text-white transition-colors cursor-pointer ml-1 border-l border-white/20 pl-2"
                  title="Reset Zoom (0)"
                  aria-label="Reset Zoom"
                  id="image-viewer-zoom-reset-btn"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Thumbnail filmstrip when product has multiple images */}
            {images.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto max-w-[90vw] pb-1 custom-scrollbar">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (idx !== currentIndex) {
                        setIsLoading(true);
                        setHasError(false);
                        resetZoomAndPan();
                        setCurrentIndex(idx);
                      }
                    }}
                    className={`w-12 h-12 rounded-xl overflow-hidden border-2 shrink-0 transition-all cursor-pointer bg-neutral-800 ${
                      currentIndex === idx
                        ? 'border-white ring-2 ring-white/40 scale-105 shadow-md'
                        : 'border-white/20 opacity-50 hover:opacity-100 hover:border-white/60'
                    }`}
                    aria-label={`Go to image ${idx + 1}`}
                    id={`image-viewer-thumb-${idx}`}
                  >
                    <img
                      src={img}
                      alt={`Thumbnail ${idx + 1}`}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </ProductImageViewerContext.Provider>
  );
}

export default ProductImageViewerProvider;
