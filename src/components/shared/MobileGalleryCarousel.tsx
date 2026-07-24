import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import BlurImage from "./BlurImage";

export interface CarouselImage {
  url: string;
  alt: string;
}

interface MobileGalleryCarouselProps {
  images: CarouselImage[];
  onImageClick: (index: number) => void;
  leadAspect?: string;
  cardAspect?: string;
}

export default function MobileGalleryCarousel({
  images,
  onImageClick,
  leadAspect = "aspect-[16/10]",
  cardAspect = "aspect-[4/3]",
}: MobileGalleryCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    const index = Math.round(el.scrollLeft / el.clientWidth);
    setActiveIndex(Math.min(index, images.length - 1));
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    return () => el.removeEventListener("scroll", checkScroll);
  }, []);

  const scrollBy = (direction: number) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.85, behavior: "smooth" });
  };

  return (
    <div className="md:hidden">
      <div
        ref={scrollRef}
        className="flex snap-x snap-mandatory overflow-x-auto -mx-5 px-5 pb-4 scrollbar-hide"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {images.map((img, i) => (
          <motion.figure
            key={img.url}
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5, delay: i * 0.04 }}
            className="group relative shrink-0 snap-center mr-3 last:mr-0 w-[82vw] max-w-[340px] overflow-hidden rounded-2xl border border-border/60 bg-muted/25 cursor-zoom-in"
            role="button"
            tabIndex={0}
            aria-label={`Ampliar: ${img.alt}`}
            onClick={() => onImageClick(i)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onImageClick(i);
              }
            }}
          >
            <div className={`w-full ${i === 0 ? leadAspect : cardAspect}`}>
              <BlurImage
                src={img.url}
                alt={img.alt}
                loading={i === 0 ? "eager" : "lazy"}
                decoding="async"
                fetchPriority={i === 0 ? "high" : "low"}
                width={680}
                height={i === 0 ? 425 : 510}
                sizes="(max-width: 768px) 82vw, 340px"
                className="h-full w-full object-cover transition-transform duration-700 group-active:scale-[1.02]"
              />
            </div>
          </motion.figure>
        ))}
      </div>

      <div className="flex items-center justify-between px-1 mt-1">
        <div className="flex gap-1.5">
          {images.map((_, i) => (
            <span
              key={i}
              className={`block h-1.5 rounded-full transition-all duration-300 ${
                i === activeIndex ? "w-4 bg-accent" : "w-1.5 bg-muted-foreground/30"
              }`}
              aria-hidden="true"
            />
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => scrollBy(-1)}
            disabled={!canScrollLeft}
            className="h-8 w-8 rounded-full border border-border/60 bg-background flex items-center justify-center text-foreground disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition-transform"
            aria-label="Imagem anterior"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => scrollBy(1)}
            disabled={!canScrollRight}
            className="h-8 w-8 rounded-full border border-border/60 bg-background flex items-center justify-center text-foreground disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition-transform"
            aria-label="Próxima imagem"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
