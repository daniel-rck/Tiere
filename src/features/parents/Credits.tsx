import { catalog } from "../../content/catalog.ts";
import data from "../../content/credits.generated.json" with { type: "json" };
import type { Credit, CreditsFile } from "../../content/types.ts";

// Loaded with the parents' area only (lazy chunk): keeps the start bundle small.
const credits = new Map((data as CreditsFile).animals.map((entry) => [entry.id, entry]));

function CreditLine({ label, credit }: { label: string; credit: Credit }) {
  return (
    <li>
      {label}: {credit.author},{" "}
      <a href={credit.licenseUrl} target="_blank" rel="noopener noreferrer">
        {credit.license}
      </a>
      ,{" "}
      <a href={credit.sourceUrl} target="_blank" rel="noopener noreferrer">
        Quelle
      </a>
    </li>
  );
}

/**
 * Spec 3.4, criterion 12: every photo and sound with author, license and
 * source. The only place with links out of the app.
 */
export function Credits() {
  return (
    <div className="credits">
      <p>
        Alle Fotos und Laute stehen unter freien Lizenzen. Danke an alle Fotografinnen und
        Fotografen!
      </p>
      {catalog.worlds.map((world) => (
        <section key={world.id}>
          <h3>{world.name}</h3>
          {catalog.animals
            .filter((animal) => animal.world === world.id)
            .map((animal) => {
              const entry = credits.get(animal.id);
              return (
                <div key={animal.id} className="credit-animal">
                  <h4>{animal.name}</h4>
                  <ul>
                    {entry?.photos.map((credit, i) => (
                      <CreditLine key={credit.sourceUrl} label={`Foto ${i + 1}`} credit={credit} />
                    ))}
                    {entry?.sound && <CreditLine label="Laut" credit={entry.sound} />}
                  </ul>
                </div>
              );
            })}
        </section>
      ))}
    </div>
  );
}
