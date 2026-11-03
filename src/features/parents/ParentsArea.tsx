import "./parents.css";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { isCorrect, makeQuestion, type Question } from "../../engine/gate.ts";
import { type Settings, writeSettings } from "../../platform/storage.ts";
import { InstallChoice } from "./InstallChoice.tsx";
import { ModeChoice } from "./ModeChoice.tsx";

type Props = { settings: Settings; onClose: () => void };

type Step = "question" | "settings" | "credits";

// The credits (every author, license and source) load only when asked for.
const Credits = lazy(async () => ({ default: (await import("./Credits.tsx")).Credits }));

/** Spec 3.4: gate, then settings and credits. */
export function ParentsArea({ settings, onClose }: Props) {
  const [step, setStep] = useState<Step>("question");
  const [question, setQuestion] = useState<Question>(() => makeQuestion());
  const [wrong, setWrong] = useState(false);
  const sheet = useRef<HTMLDivElement>(null);
  const focusedStep = useRef<Step | undefined>(undefined);

  // Each step starts with the focus on its first control.
  useEffect(() => {
    if (focusedStep.current === step) return;
    focusedStep.current = step;
    sheet.current?.querySelector<HTMLElement>("button, a")?.focus({ preventScroll: true });
  }, [step]);

  const answer = (choice: number) => {
    if (isCorrect(question, choice)) {
      setStep("settings");
    } else {
      setWrong(true);
      setQuestion(makeQuestion());
    }
  };

  return (
    // oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- the backdrop closes like "Abbrechen"; Escape is handled globally
    <div
      className="modal"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={sheet}
        className={step === "credits" ? "sheet sheet-wide" : "sheet"}
        role="dialog"
        aria-modal="true"
        aria-labelledby="parents-title"
      >
        {step === "question" && (
          <>
            <h2 id="parents-title">Nur für Eltern</h2>
            <p>
              {wrong
                ? "Nicht richtig. Hier ist eine neue Aufgabe."
                : "Löse die Aufgabe, um die Einstellungen zu öffnen."}
            </p>
            <p className="sum" aria-live="polite">
              {question.a} + {question.b} = ?
            </p>
            <div className="answers">
              {question.options.map((option) => (
                <button key={option} type="button" onClick={() => answer(option)}>
                  {option}
                </button>
              ))}
            </div>
            <button type="button" className="ghost" onClick={onClose}>
              Abbrechen
            </button>
          </>
        )}

        {step === "settings" && (
          <>
            <h2 id="parents-title">Einstellungen</h2>
            <p>Für welches Alter soll die App sein?</p>
            <ModeChoice mode={settings.mode} />
            <div className="choices">
              <button
                type="button"
                aria-pressed={settings.voice}
                onClick={() => writeSettings({ voice: !settings.voice })}
              >
                <b>Namen-Knopf {settings.voice ? "an" : "aus"}</b>
                <span>
                  Lautsprecher-Knopf im Vollbild, der den Namen sagt. Die Stimme kommt vom Gerät.
                </span>
              </button>
              <button
                type="button"
                aria-pressed={settings.sounds}
                onClick={() => writeSettings({ sounds: !settings.sounds })}
              >
                <b>Tierlaute {settings.sounds ? "an" : "aus"}</b>
                <span>Spielt beim Öffnen und Antippen den Laut des Tiers.</span>
              </button>
            </div>
            <InstallChoice />
            <button type="button" className="ghost" onClick={() => setStep("credits")}>
              Bildnachweise
            </button>
            <button type="button" className="done" onClick={onClose}>
              Fertig
            </button>
          </>
        )}

        {step === "credits" && (
          <>
            <h2 id="parents-title">Bildnachweise</h2>
            <Suspense fallback={<p>Lädt …</p>}>
              <Credits />
            </Suspense>
            <button type="button" className="done" onClick={() => setStep("settings")}>
              Zurück
            </button>
          </>
        )}
      </div>
    </div>
  );
}
