import { catalog } from "../../content/catalog.ts";
import type { Credit } from "../../content/types.ts";

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
            .map((animal) => (
              <div key={animal.id} className="credit-animal">
                <h4>{animal.name}</h4>
                <ul>
                  {animal.photos.map((photo, i) => (
                    <CreditLine
                      key={photo.sizes[0]?.src ?? i}
                      label={`Foto ${i + 1}`}
                      credit={photo.credit}
                    />
                  ))}
                  {animal.sound && <CreditLine label="Laut" credit={animal.sound.credit} />}
                </ul>
              </div>
            ))}
        </section>
      ))}
    </div>
  );
}
