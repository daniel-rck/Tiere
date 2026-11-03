import { useState } from "react";
import { useInstallPrompt } from "../../lib/ui/useInstallPrompt.ts";
import { isInstalled } from "../../platform/display.ts";

/**
 * Spec 3.4/3.5: install the app. Uses the web-base hook, not its
 * InstallButton (small, and a dialog of its own inside the sheet).
 */
export function InstallChoice() {
  const { canInstall, isIOS, isStandalone, promptInstall } = useInstallPrompt();
  const [help, setHelp] = useState(false);

  if (isStandalone || isInstalled()) return null;

  if (canInstall) {
    return (
      <div className="choices">
        <button type="button" onClick={() => void promptInstall()}>
          <b>App installieren</b>
          <span>Auf den Home-Bildschirm. Danach läuft sie ohne Internet.</span>
        </button>
      </div>
    );
  }

  if (!isIOS) return null;

  return (
    <div className="choices">
      <button type="button" aria-expanded={help} onClick={() => setHelp((open) => !open)}>
        <b>App installieren</b>
        <span>Auf den Home-Bildschirm. Danach läuft sie ohne Internet.</span>
      </button>
      {help && (
        <p className="install-help">
          In Safari unten auf „Teilen“ tippen, dann „Zum Home-Bildschirm“ wählen und mit
          „Hinzufügen“ bestätigen.
        </p>
      )}
    </div>
  );
}
