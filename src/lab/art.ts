/** Laadt de tegels uit public/art/ (gemaakt door tools/build-art.mjs). */

export type ArtSleutel =
  | 'planeet' | 'bewoond' | 'komeet' | 'gat' | 'stil'
  | 'seat' | 'rug' | 'nexus' | 'supernova' | 'oog' | 'oogtegel';

const BESTANDEN: Record<ArtSleutel, string> = {
  planeet: 'art/planeet.webp',
  bewoond: 'art/bewoond.webp',
  komeet: 'art/komeet.webp',
  gat: 'art/gat.webp',
  stil: 'art/stil.webp',
  seat: 'art/seat.webp',
  rug: 'art/rug.webp',
  nexus: 'art/nexus.webp',
  supernova: 'art/supernova.webp',
  oog: 'art/oog.webp',
  oogtegel: 'art/oogtegel.webp',
};

export type Art = Partial<Record<ArtSleutel, HTMLImageElement>>;

export async function laadArt(): Promise<Art> {
  const uit: Art = {};
  await Promise.all(
    (Object.keys(BESTANDEN) as ArtSleutel[]).map(
      (k) =>
        new Promise<void>((klaar) => {
          const img = new Image();
          img.onload = () => {
            uit[k] = img;
            klaar();
          };
          // ontbreekt een bestand, dan tekent het bord die tegel zelf
          img.onerror = () => klaar();
          img.src = BESTANDEN[k];
        }),
    ),
  );
  return uit;
}
