import "./parents.css";
import { useEffect, useRef, useState } from "react";
import { holdProgress } from "../../engine/gate.ts";
import { GearIcon } from "../shared/icons.tsx";

type Props = { onOpen: () => void };

/**
 * Spec 3.1: the gear opens the parents' area only after a 1.5 s press with a
 * visible progress ring. A short tap shows a hint.
 */
export function GearButton({ onOpen }: Props) {
  const [progress, setProgress] = useState(0);
  const [hint, setHint] = useState(false);
  const frame = useRef<number | undefined>(undefined);
  const startedAt = useRef<number | undefined>(undefined);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const stop = () => {
    if (frame.current !== undefined) cancelAnimationFrame(frame.current);
    frame.current = undefined;
    startedAt.current = undefined;
    setProgress(0);
  };

  useEffect(() => {
    const timer = hintTimer;
    return () => {
      if (frame.current !== undefined) cancelAnimationFrame(frame.current);
      clearTimeout(timer.current);
    };
  }, []);

  const onPointerDown = (event: React.PointerEvent) => {
    event.preventDefault();
    stop();
    startedAt.current = performance.now();
    const tick = (now: number) => {
      const p = holdProgress(startedAt.current ?? now, now);
      setProgress(p);
      if (p >= 1) {
        stop();
        onOpen();
      } else {
        frame.current = requestAnimationFrame(tick);
      }
    };
    frame.current = requestAnimationFrame(tick);
  };

  const onRelease = (showHint: boolean) => {
    const wasHolding = startedAt.current !== undefined;
    stop();
    if (showHint && wasHolding) {
      setHint(true);
      clearTimeout(hintTimer.current);
      hintTimer.current = setTimeout(() => setHint(false), 2600);
    }
  };

  return (
    <>
      <button
        type="button"
        className="gear"
        style={{ "--p": progress } as React.CSSProperties}
        aria-label="Eltern-Einstellungen (lange drücken)"
        onPointerDown={onPointerDown}
        onPointerUp={() => onRelease(true)}
        onPointerLeave={() => onRelease(false)}
        onPointerCancel={() => onRelease(false)}
        onContextMenu={(event) => event.preventDefault()}
        onKeyDown={(event) => {
          // Keyboards belong to grown-ups: Enter or Space go straight to the question.
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onOpen();
          }
        }}
      >
        <GearIcon />
      </button>
      <div className={hint ? "toast is-shown" : "toast"} role="status">
        {hint ? "Für die Eltern-Einstellungen das Zahnrad lange drücken" : ""}
      </div>
    </>
  );
}
