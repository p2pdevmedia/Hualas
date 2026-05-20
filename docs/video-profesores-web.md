# Video web exacto para profesores

Este video usa capturas reales de la experiencia web de profesor, renderizadas desde Next.js en 1280x720 contra una base PostgreSQL local temporal con datos demo.

## Archivos generados

- `docs/video-profesores-web-frames/` - capturas exactas de las paginas web.
- `docs/video-profesores-web.mp4` - video sin voz.
- `docs/video-profesores-web-axel.wav` - narracion generada con el kit local de voz de Axel.
- `docs/video-profesores-web-con-voz-axel.mp4` - video final con voz de Axel.
- `docs/video-profesores-web-narracion.txt` - texto limpio de narracion.
- `docs/video-profesores-web-axel-gen.txt` - texto tagueado para F5-TTS multi-referencia.

## Flujo mostrado

1. Login de profesor.
2. Agenda semanal en `my-activities`.
3. Detalle de jornada desde la agenda.
4. Hub de la jornada.
5. Asistencia.
6. Observaciones y planificacion.
7. Descripcion de la jornada.
8. Informacion de contacto.
9. Reporte puntual para familia.
10. Chat con responsable.
11. Noticias.
12. Historial de pagos.
13. Datos bancarios propios.

## Reproducir

La semilla demo esta protegida para correr solo contra `hualas_video` en `127.0.0.1:55432`.

```bash
DATABASE_URL='postgresql://postgres@127.0.0.1:55432/hualas_video' node scripts/seed-professor-web-video-demo.mjs
BASE_URL='http://127.0.0.1:3003' node scripts/capture-professor-web-video.mjs
swift scripts/render-professor-web-video.swift
/tmp/hualas-voice-venv311/bin/f5-tts_infer-cli --config /Users/dexter/projects/axel/f5/f5-spanish-axel-multiref.toml --gen_file docs/video-profesores-web-axel-gen.txt --output_dir docs --output_file video-profesores-web-axel.wav --remove_silence --speed 1.08
```
