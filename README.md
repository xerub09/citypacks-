# citypacks-

Catalog and **source assets** for offline city packs used by [City Conquest](https://github.com/xerub09/city-conquest) (and similar clients). Large binaries are **not** stored in git; they are published as **GitHub Release** attachments.

## Layout

| Path | Purpose |
|------|--------|
| `cities.json` | **App catalog**: list of cities, versions, and `packBaseUrl` for each GitHub release download base. |
| `cities/{cityId}/{version}/` | Curated POIs, generated `metadata.json`, and notes for that pack. |
| `scripts/generate-pack-metadata.js` | Computes `metadata.json` (file sizes + bounds) from local PMTiles and optional sidecars. |

Example:

```text
cities/
  bucharest/
    v1/
      curated-pois.geojson   # tourist POI list (ship same basename on the release)
      metadata.json          # regenerate with the script when PMTiles or POIs change
```

## Publishing a city pack (e.g. Bucharest v1)

1. Create a **GitHub Release** whose tag matches the catalog, e.g. `bucharest-v1` (tag name = last segment of `packBaseUrl`).
2. Attach to that release:
   - `metadata.json` (from `cities/bucharest/v1/` after you run the script)
   - `{cityId}.pmtiles` (e.g. `bucharest.pmtiles`)
   - `curated-pois.geojson` (copy from this repo or regenerate)
3. Update **`cities.json`** on `main` if the version or URL changes.

Regenerate metadata when any attached file changes:

```bash
node scripts/generate-pack-metadata.js \
  --pmtiles /path/to/bucharest.pmtiles \
  --city-id bucharest \
  --version v1 \
  --center 26.1,44.43,12 \
  --bounds 25.95,44.33,26.25,44.55 \
  --curated-pois cities/bucharest/v1/curated-pois.geojson \
  --output cities/bucharest/v1/metadata.json
```

Optional: include a pre-built **`streets.sqlite`** in the same release and add it to metadata:

```bash
  --streets-sqlite /path/to/streets.sqlite
```

*(The mobile app must be updated to download that file from the city pack if you add it; today streets may still use a separate streets release.)*

## Streets database: app vs release

- **On-device:** City Conquest can **build** `streets.sqlite` from road geometry inside **PMTiles** (first run can be slow, CPU/battery heavy).
- **Pre-built (recommended for production):** Ship **`streets.sqlite`** alongside the PMTiles in the **same** release when the app supports fetching it from the pack manifest. That gives faster, more predictable first-time map matching.

Use whichever matches your current app version; prefer **pre-built in the `bucharest-v1` release** once the client lists `streets.sqlite` in pack `metadata.json` and downloads it.

## Legacy

Older releases (`bucharest-v5`, `bucharest-v6-protomaps`, `tiles.zip` vector tree, root `style.json`) are superseded by the **per-city folder** layout and **PMTiles** + `cities.json` catalog above.
