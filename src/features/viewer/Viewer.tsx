import "./viewer.css";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CatalogAnimal, CatalogPhoto } from "../../content/types.ts";
import { classify, cycle, dragAxis, type Point } from "../../engine/gestures.ts";
import { containSize, pickSize } from "../../engine/sizes.ts";
import type { Settings } from "../../platform/storage.ts";
import { BackIcon, NextIcon, PrevIcon } from "../shared/icons.tsx";
import { announce } from "./announce.ts";

type Props = {
  animals: CatalogAnimal[];
  index: number;
  settings: Settings;
  onClose: () => void;
  onChange: (index: number) => void;
};

type Viewport = { width: number; height: number; dpr: number };

function readViewport(): Viewport {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    dpr: window.devicePixelRatio || 1,
  };
}

function useViewport(): Viewport {
  const [viewport, setViewport] = useState(readViewport);
  useEffect(() => {
    const update = () => setViewport(readViewport());
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return viewport;
}

/** The file for the full-screen photo: as many pixels as it covers under contain. */
function bigSrc(photo: CatalogPhoto, viewport: Viewport): string | undefined {
  const shown = containSize(photo.width, photo.height, viewport.width, viewport.height);
  return pickSize(photo.sizes, shown.width, viewport.dpr)?.src;
}

function preload(src: string | undefined): void {
  if (!src) return;
  const image = new Image();
  image.decoding = "async";
  image.src = src;
}

/** Spec 3.3: the photo on the whole screen, never cropped, blurred copy behind it. */
export function Viewer({ animals, index, settings, onClose, onChange }: Props) {
  const animal = animals[index];
  const [photoIndex, setPhotoIndex] = useState(0);
  const [slide, setSlide] = useState<"" | "left" | "right" | "up" | "down">("");
  const [bubble, setBubble] = useState(0);
  const [boing, setBoing] = useState(0);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const start = useRef<Point | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const viewport = useViewport();

  const photos = useMemo(() => animal?.photos ?? [], [animal]);
  const photo = photos[Math.min(photoIndex, photos.length - 1)];

  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true });
  }, []);

  // Neighbours are ready before the child swipes (spec 3.3, 8: ≤ 150 ms).
  useEffect(() => {
    const next = animals[cycle(index, 1, animals.length)]?.photos[0];
    const prev = animals[cycle(index, -1, animals.length)]?.photos[0];
    const nextPhoto = photos[cycle(photoIndex, 1, photos.length)];
    for (const candidate of [next, prev, nextPhoto]) {
      if (candidate) preload(bigSrc(candidate, viewport));
    }
  }, [animals, index, photoIndex, photos, viewport]);

  if (!animal || !photo) return null;

  const showAnimal = (step: number) => {
    const target = cycle(index, step, animals.length);
    const next = animals[target];
    setPhotoIndex(0);
    setSlide(step > 0 ? "left" : "right");
    setBubble((n) => n + 1);
    if (next) announce(next, settings);
    onChange(target);
  };

  const showPhoto = (step: number) => {
    if (photos.length < 2) return;
    setSlide(step > 0 ? "up" : "down");
    setPhotoIndex((current) => cycle(current, step, photos.length));
  };

  const tap = () => {
    setBoing((n) => n + 1);
    setBubble((n) => n + 1);
    announce(animal, settings);
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if ((event.target as Element).closest("button")) return;
    start.current = { x: event.clientX, y: event.clientY, t: event.timeStamp };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const from = start.current;
    if (!from) return;
    const dx = event.clientX - from.x;
    const dy = event.clientY - from.y;
    const axis = dragAxis(dx, dy);
    if (axis === "x") setDrag({ x: dx, y: 0 });
    else if (axis === "y" && photos.length > 1) setDrag({ x: 0, y: dy });
  };
  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const from = start.current;
    start.current = null;
    setDrag(null);
    if (!from) return;
    const gesture = classify(from, { x: event.clientX, y: event.clientY, t: event.timeStamp });
    if (gesture.kind === "tap") tap();
    else if (gesture.kind === "swipe") {
      if (gesture.direction === "left") showAnimal(1);
      else if (gesture.direction === "right") showAnimal(-1);
      else if (gesture.direction === "up") showPhoto(1);
      else showPhoto(-1);
    }
  };
  const onPointerCancel = () => {
    start.current = null;
    setDrag(null);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowRight") showAnimal(1);
    else if (event.key === "ArrowLeft") showAnimal(-1);
    else if (event.key === "ArrowDown") showPhoto(1);
    else if (event.key === "ArrowUp") showPhoto(-1);
    else return;
    event.preventDefault();
  };

  const background = photo.sizes[0]?.src;
  const src = bigSrc(photo, viewport);
  const word = animal.voice.kind === "sound" ? animal.voice.text : "🤫";

  return (
    // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- arrow keys switch animals inside the dialog
    <div
      className="viewer"
      role="dialog"
      aria-modal="true"
      aria-label={animal.name}
      onKeyDown={onKeyDown}
    >
      <div
        className="stage"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        <img className="stage-bg" src={background} alt="" draggable={false} />
        <div key={`boing-${boing}`} className={boing > 0 ? "photo is-boing" : "photo"}>
          <img
            key={src}
            className={`photo-fg ${slide ? `in-${slide}` : ""}`}
            style={
              drag
                ? { transform: `translate(${drag.x}px, ${drag.y}px)`, transition: "none" }
                : undefined
            }
            src={src}
            alt={animal.name}
            draggable={false}
          />
        </div>
        <div key={`bubble-${bubble}`} className="bubble" aria-hidden="true">
          {word}
        </div>
        {photos.length > 1 && (
          <div className="dots" aria-hidden="true">
            {photos.map((p, i) => (
              <span key={p.sizes[0]?.src ?? i} className={i === photoIndex ? "dot is-on" : "dot"} />
            ))}
          </div>
        )}
        <button
          ref={closeRef}
          type="button"
          className="viewer-button viewer-close"
          aria-label="Zurück"
          onClick={onClose}
        >
          <BackIcon />
        </button>
        <button
          type="button"
          className="viewer-button viewer-prev"
          aria-label="Vorheriges Tier"
          onClick={() => showAnimal(-1)}
        >
          <PrevIcon />
        </button>
        <button
          type="button"
          className="viewer-button viewer-next"
          aria-label="Nächstes Tier"
          onClick={() => showAnimal(1)}
        >
          <NextIcon />
        </button>
      </div>
    </div>
  );
}
