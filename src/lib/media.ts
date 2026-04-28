/**
 * Mapa central de assets visuales del club.
 *
 * Mientras no haya foto real, cada asset cae en `placeholder` (un gradiente
 * definido en globals.css). Cuando se suban las fotos a public/images/hualas/,
 * solo se cambia el campo `src` acá. Los componentes detectan src vacío y
 * renderizan el placeholder.
 */

export type MediaPlaceholder =
  | 'gradient-moss'
  | 'gradient-glacier'
  | 'gradient-obsidian';

export interface MediaAsset {
  src: string;
  alt: string;
  placeholder: MediaPlaceholder;
  width?: number;
  height?: number;
}

// TODO: replace with real photo from @hualas_patagonico
export const HERO_HOME: MediaAsset = {
  src: '',
  alt: 'Cordillera de los Andes patagónicos al amanecer',
  placeholder: 'gradient-moss',
};

// TODO: replace with real photo from @hualas_patagonico
export const HERO_HOME_CTA: MediaAsset = {
  src: '',
  alt: 'Grupo del club en travesía de montaña',
  placeholder: 'gradient-glacier',
};

// TODO: replace with real photo from @hualas_patagonico
export const HERO_LOGIN: MediaAsset = {
  src: '',
  alt: 'Lago Lácar al atardecer',
  placeholder: 'gradient-obsidian',
};

// TODO: replace with real photo from @hualas_patagonico
export const HERO_REGISTER: MediaAsset = {
  src: '',
  alt: 'Sendero hacia el Lanín',
  placeholder: 'gradient-moss',
};

// TODO: replace with real photo from @hualas_patagonico
export const HERO_CONTACT: MediaAsset = {
  src: '',
  alt: 'Refugio de montaña en San Martín de los Andes',
  placeholder: 'gradient-glacier',
};

// TODO: replace with real photo from @hualas_patagonico
export const HERO_PROFILE: MediaAsset = {
  src: '',
  alt: 'Bosque andino patagónico',
  placeholder: 'gradient-moss',
};

// TODO: replace with real photo from @hualas_patagonico
export const ACTIVITIES_GALLERY: readonly MediaAsset[] = [
  {
    src: '',
    alt: 'Escalada en roca patagónica',
    placeholder: 'gradient-moss',
  },
  {
    src: '',
    alt: 'Trekking de día completo',
    placeholder: 'gradient-glacier',
  },
  {
    src: '',
    alt: 'Salida con niñas y niños del club',
    placeholder: 'gradient-moss',
  },
  {
    src: '',
    alt: 'Expedición de varios días',
    placeholder: 'gradient-obsidian',
  },
  {
    src: '',
    alt: 'Travesía sobre hielo',
    placeholder: 'gradient-glacier',
  },
  {
    src: '',
    alt: 'Salida de verano por los Andes',
    placeholder: 'gradient-moss',
  },
] as const;

/**
 * Devuelve la clase Tailwind del background gradient correspondiente al
 * placeholder. Útil para los fallbacks cuando media.src está vacío.
 */
export function placeholderBgClass(p: MediaPlaceholder): string {
  switch (p) {
    case 'gradient-moss':
      return 'bg-gradient-moss';
    case 'gradient-glacier':
      return 'bg-gradient-glacier';
    case 'gradient-obsidian':
      return 'bg-gradient-obsidian';
  }
}
