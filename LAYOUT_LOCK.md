# DREAM Approved Layout Lock

Status: **LOCKED**

Approved by the site owner on August 26, 2026.

The approved visual baseline is Git commit `6f43be3047fc1d2557c962a9c9498716a7615c66` and tag `dream-layout-approved-2026-08-26`.

## Rule

Do not change the layout, theme, colors, typography, spacing, responsive composition, navigation presentation, cards, buttons, stars, hero, imagery, or other visual styling unless the site owner explicitly asks to **unlock the layout** and identifies the requested visual change.

Content, integrations, analytics, SEO/AEO metadata, accessibility fixes, security fixes, and backend behavior may be updated only when they do not alter the approved appearance. If an authorized nonvisual change would affect the appearance, stop and obtain explicit approval first.

## Protected visual files

- `src/components/DreamJournal.tsx`
- `src/index.css`
- `src/App.tsx`
- `src/components/ConsentBanner.tsx`
- `public/dream-brand-icon.png`
- `public/dream-brand-banner.png`

## Baseline checksums

```text
56685276ea52cff3377d37ff92bc760cd9d8078ca0ffa420b6a93ad3b0e79308  src/components/DreamJournal.tsx
85e3032bfc3286f1b09b89aeb4335bfa722a4d138b64a27fb5d9b58dd676ea13  src/index.css
811c3bba7c93015bb1302617f1033ba3d61bbc71f9fb38e5319b3ac8c21585e4  src/App.tsx
7b7e6217ab922a9b41d4baca069b2d171140f257ef5a5413db7d53ad62da5d59  src/components/ConsentBanner.tsx
575562f42ef3d3cc500e2712500b95aa9c78035f81a18e698fa7d082fe67d5cc  public/dream-brand-icon.png
2f8af75bb952b5a65a422d65ab273cd7c21c3571afcb14eb16e3b427012a28c7  public/dream-brand-banner.png
```

To restore the exact approved visual baseline, compare against the named tag. Do not restore by overwriting newer backend or integration work; selectively restore only authorized visual files.
