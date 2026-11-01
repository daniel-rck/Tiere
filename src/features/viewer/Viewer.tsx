import "./viewer.css";
import "./panel.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { withArticle } from "../../content/catalog.ts";
import type { CatalogAnimal, CatalogPhoto } from "../../content/types.ts";
import { classify, cycle, dragAxis, isDoubleTap, type Point } from "../../engine/gestures.ts";
import { containSize, pickSize } from "../../engine/sizes.ts";
import {
  clamp,
  IDENTITY,
  isZoomed,
  pan,
  pinch,
  toggle,
  type Vec,
  type Zoom,
} from "../../engine/zoom.ts";
import type { Settings } from "../../platform/storage.ts";
import { BackIcon, NextIcon, PrevIcon, SpeakerIcon } from "../shared/icons.tsx";
import { announce, readAloud } from "./announce.ts";

type Props = {
  animals: CatalogAnimal[];
  index: number;
  settings: Settings;
  onClose: () => void;
  onChange: (index: number) => void;
};

type Box = { width: number; height: number };

const DOUBLE_TAP_WAIT = 300;

function useStageSize(ref: React.RefObject<HTMLElement | null>): Box & { dpr: number } {
  const [size, setSize] = useState({ width: 0, height: 0, dpr: 1 });
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () => {
      const rect = element.getBoundingClientRect();
      setSize({
        width: rect.width || window.innerWidth,
        height: rect.height || window.innerHeight,
        dpr: window.devicePixelRatio || 1,
      });
    };
    update();
    const observer = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(update);
    observer?.observe(element);
    window.addEventListener("resize", update);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [ref]);
  return size;
}

/** The file for the full-screen photo: as many pixels as it covers under contain. */
function bigSrc(photo: CatalogPhoto, stage: Box & { dpr: number }): string | undefined {
  const shown = containSize(photo.width, photo.height, stage.width, stage.height);
  return pickSize(photo.sizes, shown.width, stage.dpr)?.src;
}

function preload(src: string | undefined): void {
  if (!src) return;
  const image = new Image();
  image.decoding = "async";
  image.src = src;
}

const reducedMotion = () =>
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Spec 3.3: the photo on the whole screen, never cropped, blurred copy behind it. */
export function Viewer({ animals, index, settings, onClose, onChange }: Props) {
  const animal = animals[index];
  const explorer = settings.mode === "explorer";
  const [photoIndex, setPhotoIndex] = useState(0);
  const [slide, setSlide] = useState<"" | "left" | "right" | "up" | "down">("");
  const [bubble, setBubble] = useState(0);
  const [drag, setDrag] = useState<Vec | null>(null);
  const [zoom, setZoom] = useState<Zoom>(IDENTITY);
  const stageRef = useRef<HTMLDivElement>(null);
  const photoRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const pointers = useRef(new Map<number, Vec>());
  const start = useRef<Point | null>(null);
  const pinchStart = useRef<{ zoom: Zoom; a: Vec; b: Vec } | null>(null);
  const panFrom = useRef<{ zoom: Zoom; at: Vec } | null>(null);
  const lastTap = useRef<Point | undefined>(undefined);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const stage = useStageSize(stageRef);

  const photos = useMemo(() => animal?.photos ?? [], [animal]);
  const photo = photos[Math.min(photoIndex, photos.length - 1)];
  const content = photo
    ? containSize(photo.width, photo.height, stage.width, stage.height)
    : { width: 0, height: 0 };

  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true });
    const timer = tapTimer;
    return () => clearTimeout(timer.current);
  }, []);

  // Neighbours are ready before the child swipes (spec 3.3, 8: ≤ 150 ms).
  useEffect(() => {
    if (stage.width === 0) return;
    const next = animals[cycle(index, 1, animals.length)]?.photos[0];
    const prev = animals[cycle(index, -1, animals.length)]?.photos[0];
    const nextPhoto = photos[cycle(photoIndex, 1, photos.length)];
    for (const candidate of [next, prev, nextPhoto]) {
      if (candidate) preload(bigSrc(candidate, stage));
    }
  }, [animals, index, photoIndex, photos, stage]);

  if (!animal || !photo) return null;

  const resetView = () => {
    setZoom(IDENTITY);
    clearTimeout(tapTimer.current);
    lastTap.current = undefined;
  };

  const showAnimal = (step: number) => {
    const target = cycle(index, step, animals.length);
    const next = animals[target];
    resetView();
    setPhotoIndex(0);
    setSlide(step > 0 ? "left" : "right");
    setBubble((n) => n + 1);
    if (next) announce(next, settings);
    onChange(target);
  };

  const showPhoto = (step: number) => {
    if (photos.length < 2) return;
    resetView();
    setSlide(step > 0 ? "up" : "down");
    setPhotoIndex((current) => cycle(current, step, photos.length));
  };

  const boing = () => {
    if (reducedMotion()) return;
    photoRef.current?.animate?.(
      [
        { transform: "none" },
        { transform: "scale(1.04)", offset: 0.3 },
        { transform: "scale(0.98)", offset: 0.6 },
        { transform: "none" },
      ],
      { duration: 450, easing: "ease" },
    );
  };

  const speakAgain = () => {
    boing();
    setBubble((n) => n + 1);
    announce(animal, settings);
  };

  /** Relative to the stage centre, where the zoom transform has its origin. */
  const local = (event: { clientX: number; clientY: number }): Vec => {
    const rect = stageRef.current?.getBoundingClientRect();
    return {
      x: event.clientX - (rect ? rect.left + rect.width / 2 : 0),
      y: event.clientY - (rect ? rect.top + rect.height / 2 : 0),
    };
  };

  const onTap = (at: Point) => {
    if (!explorer) {
      speakAgain();
      return;
    }
    // Explorer: wait whether a second tap makes it a double tap (zoom).
    if (isDoubleTap(lastTap.current, at)) {
      clearTimeout(tapTimer.current);
      lastTap.current = undefined;
      setZoom((current) =>
        clamp(toggle(current, local({ clientX: at.x, clientY: at.y })), content, stage),
      );
      return;
    }
    lastTap.current = at;
    const zoomedNow = isZoomed(zoom);
    tapTimer.current = setTimeout(() => {
      lastTap.current = undefined;
      if (!zoomedNow) speakAgain();
    }, DOUBLE_TAP_WAIT);
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if ((event.target as Element).closest("button")) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, local(event));
    if (pointers.current.size === 2 && explorer) {
      const [a, b] = [...pointers.current.values()] as [Vec, Vec];
      pinchStart.current = { zoom, a, b };
      start.current = null;
      setDrag(null);
      return;
    }
    if (pointers.current.size === 1) {
      start.current = { x: event.clientX, y: event.clientY, t: event.timeStamp };
      panFrom.current = isZoomed(zoom) ? { zoom, at: local(event) } : null;
    }
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, local(event));
    const pinching = pinchStart.current;
    if (pinching && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()] as [Vec, Vec];
      setZoom(clamp(pinch(pinching.zoom, pinching.a, pinching.b, a, b), content, stage));
      return;
    }
    const from = start.current;
    if (!from) return;
    if (panFrom.current) {
      const now = local(event);
      const { zoom: z, at } = panFrom.current;
      setZoom(clamp(pan(z, now.x - at.x, now.y - at.y), content, stage));
      return;
    }
    const dx = event.clientX - from.x;
    const dy = event.clientY - from.y;
    const axis = dragAxis(dx, dy);
    if (axis === "x") setDrag({ x: dx, y: 0 });
    else if (axis === "y" && photos.length > 1) setDrag({ x: 0, y: dy });
  };

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);
    if (pinchStart.current) {
      // A pinch ends when the last finger lifts; no tap, no swipe.
      if (pointers.current.size === 0) pinchStart.current = null;
      start.current = null;
      return;
    }
    const from = start.current;
    const panned = panFrom.current;
    start.current = null;
    panFrom.current = null;
    setDrag(null);
    if (!from) return;
    const end = { x: event.clientX, y: event.clientY, t: event.timeStamp };
    const gesture = classify(from, end);
    if (gesture.kind === "tap") onTap(end);
    // Zoomed in, a drag moves the photo: swiping never changes the animal (criterion 7).
    else if (gesture.kind === "swipe" && !panned && !isZoomed(zoom)) {
      if (gesture.direction === "left") showAnimal(1);
      else if (gesture.direction === "right") showAnimal(-1);
      else if (gesture.direction === "up") showPhoto(1);
      else showPhoto(-1);
    }
  };

  const onPointerCancel = (event: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size === 0) pinchStart.current = null;
    start.current = null;
    panFrom.current = null;
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
  const src = bigSrc(photo, stage);
  const word = animal.voice.kind === "sound" ? animal.voice.text : "🤫";
  const zoomed = isZoomed(zoom);
  const transform = drag
    ? `translate(${drag.x}px, ${drag.y}px)`
    : zoomed
      ? `translate(${zoom.x}px, ${zoom.y}px) scale(${zoom.scale})`
      : undefined;

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
        ref={stageRef}
        className="stage"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        <img className="stage-bg" src={background} alt="" draggable={false} />
        <div ref={photoRef} className="photo">
          {src && (
            <img
              key={src}
              className={`photo-fg ${slide ? `in-${slide}` : ""} ${drag || zoomed ? "is-zoomed" : ""}`}
              style={transform ? { transform } : undefined}
              src={src}
              alt={animal.name}
              draggable={false}
            />
          )}
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
      {explorer && (
        <section className="panel" aria-label="Steckbrief">
          <h2>
            <span className="panel-article">{animal.article}</span>
            {animal.name}
          </h2>
          <ul>
            {animal.facts.map((fact) => (
              <li key={fact}>{fact}</li>
            ))}
          </ul>
          <button
            type="button"
            className="read"
            onClick={() => readAloud(`${withArticle(animal)}. ${animal.facts.join(" ")}`)}
          >
            <SpeakerIcon />
            Vorlesen
          </button>
        </section>
      )}
    </div>
  );
}
