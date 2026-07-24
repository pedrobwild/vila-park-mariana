import { useState, ImgHTMLAttributes, useRef, useEffect, SyntheticEvent } from "react";
import { ImageOff, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface BlurImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  wrapperClassName?: string;
  fallbackLabel?: string;
  retryLabel?: string;
}

/**
 * Image with animated blur-up placeholder and error fallback.
 * - Shows a shimmer gradient while loading, then fades the image in.
 * - On load error, renders a graceful placeholder with a "retry" button
 *   that preserves layout (no CLS) and lets the user try again.
 */
export default function BlurImage({
  wrapperClassName,
  className,
  onLoad,
  onError,
  src,
  alt,
  fallbackLabel = "Não foi possível carregar a imagem",
  retryLabel = "Tentar novamente",
  ...rest
}: BlurImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const imgRef = useRef<HTMLImageElement>(null);

  // Reset state when src changes
  useEffect(() => {
    setLoaded(false);
    setErrored(false);
    setAttempt(0);
  }, [src]);

  // Handle already-cached images (onLoad may not fire)
  useEffect(() => {
    if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
      setLoaded(true);
    }
  }, [src, attempt]);

  const handleError = (e: SyntheticEvent<HTMLImageElement>) => {
    setErrored(true);
    setLoaded(false);
    onError?.(e);
  };

  const handleRetry = () => {
    setErrored(false);
    setLoaded(false);
    setAttempt((n) => n + 1);
  };

  // Cache-busting only when retrying, so the browser refetches a failed asset
  const resolvedSrc =
    attempt > 0 && typeof src === "string"
      ? `${src}${src.includes("?") ? "&" : "?"}retry=${attempt}`
      : src;

  return (
    <div className={cn("relative h-full w-full overflow-hidden", wrapperClassName)}>
      {/* Shimmer placeholder (visible while loading, hidden on success/error) */}
      <div
        aria-hidden="true"
        className={cn(
          "absolute inset-0 bg-muted/40",
          "before:absolute before:inset-0 before:-translate-x-full",
          "before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent",
          "before:animate-[shimmer_1.6s_infinite]",
          "transition-opacity duration-500",
          loaded || errored ? "opacity-0" : "opacity-100"
        )}
      />

      {/* Error fallback — preserves layout, offers retry */}
      {errored && (
        <div
          role="alert"
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-muted/60 p-4 text-center"
        >
          <ImageOff className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
          <p className="max-w-[24ch] text-xs text-muted-foreground">{fallbackLabel}</p>
          <button
            type="button"
            onClick={handleRetry}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/80 px-3 py-1.5",
              "text-xs font-medium text-foreground shadow-sm",
              "hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            )}
            aria-label={`${retryLabel}${alt ? `: ${alt}` : ""}`}
          >
            <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
            {retryLabel}
          </button>
        </div>
      )}

      <img
        ref={imgRef}
        src={resolvedSrc}
        alt={alt}
        onLoad={(e) => {
          setLoaded(true);
          setErrored(false);
          onLoad?.(e);
        }}
        onError={handleError}
        className={cn(
          "transition-opacity duration-700 ease-out",
          loaded && !errored ? "opacity-100" : "opacity-0",
          className
        )}
        {...rest}
      />
    </div>
  );
}
