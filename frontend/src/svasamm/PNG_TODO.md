# PNG TODO

PNG renders of `favicon.svg` are still needed to replace the upstream Frappe
favicon + PWA manifest icons. No SVG→PNG conversion tool was available on the
bootstrap machine (`rsvg-convert`, `magick`, `convert`, `inkscape` all absent),
so the upstream binaries were left untouched.

## Files still to replace

| Target path                                         | Size      | Source                                 |
| --------------------------------------------------- | --------- | -------------------------------------- |
| `frontend/public/favicon.png`                       | 64×64     | `frontend/src/svasamm/favicon.svg`     |
| `crm/public/manifest/apple-icon-180.png`            | 180×180   | `frontend/src/svasamm/favicon.svg`     |
| `crm/public/manifest/manifest-icon-192.maskable.png`| 192×192   | `frontend/src/svasamm/favicon.svg`     |
| `crm/public/manifest/manifest-icon-512.maskable.png`| 512×512   | `frontend/src/svasamm/favicon.svg`     |

## Ready-to-run: rsvg-convert (`brew install librsvg`)

```bash
cd $(git rev-parse --show-toplevel)
rsvg-convert -w 64  -h 64  frontend/src/svasamm/favicon.svg -o frontend/public/favicon.png
rsvg-convert -w 180 -h 180 frontend/src/svasamm/favicon.svg -o crm/public/manifest/apple-icon-180.png
rsvg-convert -w 192 -h 192 frontend/src/svasamm/favicon.svg -o crm/public/manifest/manifest-icon-192.maskable.png
rsvg-convert -w 512 -h 512 frontend/src/svasamm/favicon.svg -o crm/public/manifest/manifest-icon-512.maskable.png
```

## Ready-to-run: ImageMagick v7 (`brew install imagemagick`)

```bash
cd $(git rev-parse --show-toplevel)
magick -background none -density 192 frontend/src/svasamm/favicon.svg -resize 64x64   frontend/public/favicon.png
magick -background none -density 300 frontend/src/svasamm/favicon.svg -resize 180x180 crm/public/manifest/apple-icon-180.png
magick -background none -density 300 frontend/src/svasamm/favicon.svg -resize 192x192 crm/public/manifest/manifest-icon-192.maskable.png
magick -background none -density 600 frontend/src/svasamm/favicon.svg -resize 512x512 crm/public/manifest/manifest-icon-512.maskable.png
```

After conversion, stage and commit the PNG files, then delete this file.
