"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ImagePlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ProfileDecorationLayer, UserAvatar } from "@/components/UserAvatar";
import {
  DEFAULT_PROFILE_DECORATION,
  PROFILE_DECORATION_OPTIONS,
  getProfileDecorationLabel,
  normalizeProfileDecoration,
  type ProfileDecoration,
} from "@/lib/profile-decoration";
import { cn } from "@/lib/utils";

type ProfileImageFieldProps = {
  initialImageUrl?: string | null;
  initialDecoration?: string | null;
};

export function ProfileImageField({
  initialImageUrl,
  initialDecoration,
}: ProfileImageFieldProps) {
  const normalizedInitialDecoration =
    normalizeProfileDecoration(initialDecoration);
  const initialIndex = Math.max(
    PROFILE_DECORATION_OPTIONS.findIndex(
      (option) => option.id === normalizedInitialDecoration,
    ),
    PROFILE_DECORATION_OPTIONS.findIndex(
      (option) => option.id === DEFAULT_PROFILE_DECORATION,
    ),
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    initialImageUrl ?? null,
  );
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [previousIndex, setPreviousIndex] = useState<number | null>(null);
  const [animationDirection, setAnimationDirection] = useState<
    "left" | "right" | null
  >(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const animationTimeoutRef = useRef<number | null>(null);

  const visibleUrl = useMemo(
    () => previewUrl ?? initialImageUrl ?? null,
    [initialImageUrl, previewUrl],
  );
  const decoration =
    PROFILE_DECORATION_OPTIONS[currentIndex]?.id ?? DEFAULT_PROFILE_DECORATION;
  const currentOption =
    PROFILE_DECORATION_OPTIONS[currentIndex] ?? PROFILE_DECORATION_OPTIONS[0];
  const previousOption =
    previousIndex == null
      ? null
      : (PROFILE_DECORATION_OPTIONS[previousIndex] ?? null);

  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current != null) {
        window.clearTimeout(animationTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [objectUrl]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setPreviewUrl(initialImageUrl ?? null);
      return;
    }

    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }
    const nextUrl = URL.createObjectURL(file);
    setObjectUrl(nextUrl);
    setPreviewUrl(nextUrl);
  };

  const handleDecorationStep = (step: -1 | 1) => {
    if (animationTimeoutRef.current != null) {
      window.clearTimeout(animationTimeoutRef.current);
    }

    const nextIndex =
      (currentIndex + step + PROFILE_DECORATION_OPTIONS.length) %
      PROFILE_DECORATION_OPTIONS.length;

    setPreviousIndex(currentIndex);
    setCurrentIndex(nextIndex);
    setAnimationDirection(step === 1 ? "left" : "right");

    animationTimeoutRef.current = window.setTimeout(() => {
      setPreviousIndex(null);
      setAnimationDirection(null);
      animationTimeoutRef.current = null;
    }, 200);
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-4">
        <UserAvatar imageUrl={visibleUrl} decoration={decoration} size="lg" />
        <div className="space-y-1">
          <p className="text-base font-semibold text-foreground">
            프로필 이미지
          </p>
          <p className="text-sm text-muted-foreground">
            JPG, PNG, WebP, GIF 이미지를 업로드할 수 있어요.
          </p>
        </div>
      </div>

      <Input
        id="profileImage"
        name="profileImage"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="peer sr-only"
        onChange={handleChange}
      />
      <label
        htmlFor="profileImage"
        className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-input bg-card px-4 py-6 text-sm font-semibold text-muted-foreground transition-colors hover:border-foreground hover:text-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-ring"
      >
        <ImagePlus className="h-5 w-5" />
        이미지 선택
      </label>
      <input type="hidden" name="profileDecoration" value={decoration} />

      <div className="space-y-2">
        <p className="text-sm font-semibold text-foreground">장식 아이템</p>
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            type="button"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-input bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="이전 장식"
            onClick={() => handleDecorationStep(-1)}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="relative flex-1 overflow-hidden rounded-lg border border-border bg-muted px-4 py-4">
            <div className="relative flex h-28 items-center justify-center">
              <UserAvatar
                imageUrl={visibleUrl}
                decoration="none"
                size="lg"
              />
              {previousOption ? (
                <div
                  key={`${previousOption.id}-previous`}
                  className={cn(
                    "absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2",
                    animationDirection === "left"
                      ? "animate-decoration-slide-out-left"
                      : "animate-decoration-slide-out-right",
                  )}
                  aria-hidden="true"
                >
                  <ProfileDecorationLayer
                    decoration={previousOption.id}
                    className="h-14 w-14"
                  />
                </div>
              ) : null}
              <div
                key={`${currentOption.id}-${animationDirection ?? "idle"}`}
                className={cn(
                  "absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2",
                  animationDirection
                    ? animationDirection === "left"
                      ? "animate-decoration-slide-in-right"
                      : "animate-decoration-slide-in-left"
                    : "",
                )}
                data-current-decoration={currentOption.id}
                aria-live="polite"
              >
                <ProfileDecorationLayer
                  decoration={currentOption.id}
                  className="h-14 w-14"
                />
                <span className="sr-only">
                  {getProfileDecorationLabel(currentOption.id)} 선택됨
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-input bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="다음 장식"
            onClick={() => handleDecorationStep(1)}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
        <div className="flex justify-center gap-2" aria-hidden="true">
          {PROFILE_DECORATION_OPTIONS.map((option) => (
            <span
              key={option.id}
              className={cn(
                "h-2 w-2 rounded-full transition-colors",
                decoration === option.id ? "bg-foreground" : "bg-input",
              )}
              data-active={decoration === option.id}
            />
          ))}
        </div>
      </div>
      <style>{`
        @keyframes decoration-slide-in-right {
          from {
            opacity: 0;
            transform: translateX(32px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }

        @keyframes decoration-slide-in-left {
          from {
            opacity: 0;
            transform: translateX(-32px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }

        @keyframes decoration-slide-out-left {
          from {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
          to {
            opacity: 0;
            transform: translateX(-32px) scale(0.96);
          }
        }

        @keyframes decoration-slide-out-right {
          from {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
          to {
            opacity: 0;
            transform: translateX(32px) scale(0.96);
          }
        }

        .animate-decoration-slide-in-right {
          animation: decoration-slide-in-right 200ms ease-out both;
        }

        .animate-decoration-slide-in-left {
          animation: decoration-slide-in-left 200ms ease-out both;
        }

        .animate-decoration-slide-out-left {
          animation: decoration-slide-out-left 200ms ease-out both;
        }

        .animate-decoration-slide-out-right {
          animation: decoration-slide-out-right 200ms ease-out both;
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-decoration-slide-in-right,
          .animate-decoration-slide-in-left,
          .animate-decoration-slide-out-left,
          .animate-decoration-slide-out-right {
            animation-duration: 1ms;
          }
        }
      `}</style>
    </section>
  );
}
