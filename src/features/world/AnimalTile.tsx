import { useState } from "react";
import type { CatalogAnimal } from "../../content/types.ts";
import { coverWidth, srcSet } from "../../engine/sizes.ts";

type Props = {
  animal: CatalogAnimal;
  showName: boolean;
  onOpen: () => void;
  /** Tiles in the first rows load eagerly. */
  eager: boolean;
};

/** Spec 3.2: 4:5 tile, cover is allowed here, placeholder in the photo's average colour. */
export function AnimalTile({ animal, showName, onOpen, eager }: Props) {
  const photo = animal.photos[0];
  const [loaded, setLoaded] = useState(false);
  // The photo is wider than the tile once it covers it: ask for that many pixels.
  const factor = photo ? coverWidth(photo.width, photo.height, 4, 5) / 4 : 1;
  const sizes = [
    `(min-width: 1100px) calc(25vw * ${factor.toFixed(2)})`,
    `(min-width: 700px) calc(33vw * ${factor.toFixed(2)})`,
    `calc(50vw * ${factor.toFixed(2)})`,
  ].join(", ");
  return (
    <button
      type="button"
      className="tile"
      style={{ backgroundColor: photo?.color }}
      aria-label={animal.name}
      onClick={onOpen}
    >
      {photo && (
        <img
          className={loaded ? "tile-img is-loaded" : "tile-img"}
          src={photo.sizes[0]?.src}
          srcSet={srcSet(photo.sizes)}
          sizes={sizes}
          alt=""
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          draggable={false}
          onLoad={() => setLoaded(true)}
        />
      )}
      {showName && <span className="tile-name">{animal.name}</span>}
    </button>
  );
}
