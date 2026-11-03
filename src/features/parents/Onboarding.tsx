import "./parents.css";
import { useEffect, useRef } from "react";
import type { Settings } from "../../platform/storage.ts";
import { InstallChoice } from "./InstallChoice.tsx";
import { ModeChoice } from "./ModeChoice.tsx";

type Props = { settings: Settings; onDone: () => void };

/**
 * Spec 3.5: in a browser tab a parent is in front of the screen. Once per
 * session: what the app is, the mode, installing and where the settings are.
 */
export function Onboarding({ settings, onDone }: Props) {
  const sheet = useRef<HTMLDivElement>(null);

  useEffect(() => {
    sheet.current?.querySelector<HTMLElement>("button")?.focus({ preventScroll: true });
  }, []);

  return (
    <div className="modal">
      <div
        ref={sheet}
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
      >
        <h2 id="onboarding-title">Willkommen bei Tiere</h2>
        <p>
          Große Tierfotos für Kinder, mit Namen und Tierlauten. Ohne Internet, ohne Werbung, ohne
          Tracking.
        </p>
        <p className="onboarding-step">Für welches Alter soll die App sein?</p>
        <ModeChoice mode={settings.mode} />
        <InstallChoice />
        <p className="onboarding-hint">
          Einstellungen und Bildnachweise liegen hinter dem Zahnrad oben rechts: lange drücken, dann
          eine Rechenaufgabe lösen.
        </p>
        <button type="button" className="done" onClick={onDone}>
          Los geht's
        </button>
      </div>
    </div>
  );
}
