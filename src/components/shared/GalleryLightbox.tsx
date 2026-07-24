import { useCallback, useEffect, useRef, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LightboxImage {
  url: string;
  alt: string;
}

interface GalleryLightboxProps {
  images: LightboxImage[];
  initialIndex: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function GalleryLightbox({ images, initialIndex, open, onOpenChange }: GalleryLightboxProps) {
  const [index, setIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  useEffect(() => {
    if (open) {
      setIndex(initialIndex);
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
  }, [open, initialIndex]);

  const current = images[index];
  const total = images.length;

  const goTo = useCallback((next: number) => {
    const clamped = (next + total) % total;
    setIndex(clamped);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [total]);

  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const prev = useCallback(() => goTo(index - 1), [goTo, index]);

  const toggleZoom = useCallback(() => {
    setZoom((z) => (z > 1 ? 1 : 2.5));
    setPan({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") { e.preventDefault(); next(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
      else if (e.key === "Home") { e.preventDefault(); goTo(0); }
      else if (e.key === "End") { e.preventDefault(); goTo(total - 1); }
      else if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        setZoom((z) => Math.min(z + 0.5, 4));
      }
      else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        setZoom((z) => {
          const n = Math.max(z - 0.5, 1);
          if (n <= 1) setPan({ x: 0, y: 0 });
          return n;
        });
      }
      else if (e.key === "0") {
        e.preventDefault();
        setZoom(1);
        setPan({ x: 0, y: 0 });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, next, prev, goTo, total]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => {
      const nextZ = Math.min(Math.max(z - e.deltaY * 0.0015, 1), 4);
      if (nextZ <= 1) setPan({ x: 0, y: 0 });
      return nextZ;
    });
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    if (zoom <= 1) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging || zoom <= 1) return;
    const dx = (e.clientX - dragStart.current.x) / zoom;
    const dy = (e.clientY - dragStart.current.y) / zoom;
    setPan({ x: dragStart.current.panX + dx, y: dragStart.current.panY + dy });
  };

  const onPointerUp = () => setIsDragging(false);

  if (!current) return null;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <AnimatePresence>
          {open && (
            <DialogPrimitive.Overlay asChild forceMount>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-40 bg-black/95"
              />
            </DialogPrimitive.Overlay>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {open && (
            <DialogPrimitive.Content
              asChild
              forceMount
              aria-label={`Galeria do decorado, imagem ${index + 1} de ${total}`}
              aria-describedby="lightbox-caption"
              onOpenAutoFocus={(e) => {
                e.preventDefault();
                containerRef.current?.focus();
              }}
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-50 flex flex-col outline-none"
                ref={containerRef}
                tabIndex={-1}
              >
                <VisuallyHidden.Root>
                  <DialogPrimitive.Title>Galeria do decorado</DialogPrimitive.Title>
                </VisuallyHidden.Root>
              {/* Top bar */}
              <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3 md:px-6 md:py-4 bg-gradient-to-b from-black/70 to-transparent">
                <div className="text-white/90 text-sm font-medium tabular">
                  <span className="text-white">{String(index + 1).padStart(2, "0")}</span>
                  <span className="text-white/50 mx-1.5">/</span>
                  <span className="text-white/70">{String(total).padStart(2, "0")}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={toggleZoom}
                    className="h-10 w-10 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                    aria-label={zoom > 1 ? "Reduzir zoom" : "Ampliar imagem"}
                  >
                    {zoom > 1 ? <ZoomOut size={20} /> : <ZoomIn size={20} />}
                  </button>
                  {zoom > 1 && (
                    <button
                      type="button"
                      onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
                      className="h-10 w-10 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                      aria-label="Redefinir zoom"
                    >
                      <RotateCcw size={18} />
                    </button>
                  )}
                  <DialogPrimitive.Close asChild>
                    <button
                      type="button"
                      className="ml-1 h-10 w-10 rounded-full flex items-center justify-center text-white/90 hover:text-white hover:bg-white/10 transition-colors"
                      aria-label="Fechar galeria"
                    >
                      <X size={22} />
                    </button>
                  </DialogPrimitive.Close>
                </div>
              </div>

              {/* Main stage */}
              <div
                className="flex-1 flex items-center justify-center overflow-hidden"
                onWheel={handleWheel}
                onDoubleClick={toggleZoom}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerLeave={onPointerUp}
                style={{ cursor: zoom > 1 ? (isDragging ? "grabbing" : "grab") : "zoom-in" }}
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.img
                    key={current.url}
                    src={current.url}
                    alt={current.alt}
                    decoding="async"
                    fetchPriority="high"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{
                      opacity: 1,
                      scale: zoom,
                      x: pan.x,
                      y: pan.y,
                    }}
                    exit={{ opacity: 0, scale: 1.02 }}
                    transition={{ opacity: { duration: 0.2 }, scale: { duration: 0.25, ease: [0.16, 1, 0.3, 1] } }}
                    className={cn(
                      "max-h-[85vh] max-w-[95vw] object-contain select-none transition-transform",
                      zoom > 1 ? "pointer-events-none" : ""
                    )}
                    draggable={false}
                  />
                </AnimatePresence>
              </div>

              {/* Preload neighbors for snappy navigation */}
              {total > 1 && (
                <div aria-hidden="true" className="hidden">
                  <img src={images[(index + 1) % total].url} alt="" decoding="async" loading="eager" />
                  <img src={images[(index - 1 + total) % total].url} alt="" decoding="async" loading="eager" />
                </div>
              )}

              {/* Caption */}
              <div className="absolute bottom-0 left-0 right-0 z-10 px-4 py-3 md:px-6 md:py-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                <p className="text-white/90 text-sm md:text-base max-w-3xl mx-auto text-center leading-relaxed">
                  {current.alt}
                </p>
              </div>

              {/* Navigation arrows */}
              {total > 1 && (
                <>
                  <button
                    type="button"
                    onClick={prev}
                    className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 h-11 w-11 md:h-12 md:w-12 rounded-full bg-black/40 hover:bg-black/60 text-white/90 hover:text-white backdrop-blur-sm flex items-center justify-center transition-colors"
                    aria-label="Imagem anterior"
                  >
                    <ChevronLeft size={24} />
                  </button>
                  <button
                    type="button"
                    onClick={next}
                    className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 h-11 w-11 md:h-12 md:w-12 rounded-full bg-black/40 hover:bg-black/60 text-white/90 hover:text-white backdrop-blur-sm flex items-center justify-center transition-colors"
                    aria-label="Próxima imagem"
                  >
                    <ChevronRight size={24} />
                  </button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
