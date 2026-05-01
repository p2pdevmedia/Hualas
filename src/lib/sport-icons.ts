export const SPORT_ICONS = [
  { file: 'Arte.png', label: 'Arte' },
  { file: 'bici_v.png', label: 'Bicicleta' },
  { file: 'Campamento_v.png', label: 'Campamento' },
  { file: 'circo.png', label: 'Circo' },
  { file: 'Dia_en_familia.png', label: 'Día en familia' },
  { file: 'Escalada_v.png', label: 'Escalada' },
  { file: 'Hockey.png', label: 'Hockey' },
  { file: 'huerta.png', label: 'Huerta' },
  { file: 'Kayak_v.png', label: 'Kayak' },
  { file: 'Montanismo.png', label: 'Montañismo' },
  { file: 'Senderismo_v.png', label: 'Senderismo' },
  { file: 'Vidaenlanat_v.png', label: 'Vida en la naturaleza' },
] as const;

export type SportIconFile = (typeof SPORT_ICONS)[number]['file'];
