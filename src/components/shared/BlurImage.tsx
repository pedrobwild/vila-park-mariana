import { useState, ImgHTMLAttributes, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface BlurImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  wrapperClassName?: string;
}

/**
 * Image with animated blur-up placeholder.
 * Shows a subtle shimmer gradient while loading, then fades the image in.
 */
export default function BlurImage({
  wrapperClassName,
  className,
  onLoad,
  src,
  ...rest
}: BlurImageProps) {
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Handle already-cached images (onLoad may not fire)
  useEffect(() => {
    if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
      setLoaded(true);
    }
  }, [src]);

  return (
    <div className={cn("relative h-full w-full overflow-hidden", wrapperClassName)}>
      <div
        aria-hidden="true"
        className={cn(
          "absolute inset-0 bg-muted/40",
          "before:absolute before:inset-0 before:-translate-x-full",
          "before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent",
          "before:animate-[shimmer_1.6s_infinite]",
          "transition-opacity duration-500",
          loaded ? "opacity-0" : "opacity-100"
        )}
      />
      <img
        ref={imgRef}
        src={src}
        onLoad={(e) => {
          setLoaded(true);
          onLoad?.(e);
        }}
        className={cn(
          "transition-opacity duration-700 ease-out",
          loaded ? "opacity-100" : "opacity-0",
          className
        )}
        {...rest}
      />
    </div>
  );
}
