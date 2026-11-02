import { type Mode, writeSettings } from "../../platform/storage.ts";

type Props = { mode: Mode };

/** Spec 3.4: toddler or explorer, in the settings and the onboarding. */
export function ModeChoice({ mode }: Props) {
  return (
    <div className="choices">
      <button
        type="button"
        aria-pressed={mode === "kid"}
        onClick={() => writeSettings({ mode: "kid" })}
      >
        <b>Kleinkind (ab 2)</b>
        <span>Große Fotos, Tiername und Tierlaut. Kein Text.</span>
      </button>
      <button
        type="button"
        aria-pressed={mode === "explorer"}
        onClick={() => writeSettings({ mode: "explorer" })}
      >
        <b>Entdecker (ab 5)</b>
        <span>Namen zum Lesen, Fakten zum Vorlesen, Zoom mit zwei Fingern.</span>
      </button>
    </div>
  );
}
