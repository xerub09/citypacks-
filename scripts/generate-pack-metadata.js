#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Build pack metadata.json for City Conquest downloads.
 * Run from repo root. PMTiles and optional streets DB are usually local-only (gitignored).
 *
 * Example (Bucharest v1):
 *   node scripts/generate-pack-metadata.js ^
 *     --pmtiles ../path/to/bucharest.pmtiles ^
 *     --city-id bucharest ^
 *     --version v1 ^
 *     --center 26.1,44.43,12 ^
 *     --bounds 25.95,44.33,26.25,44.55 ^
 *     --curated-pois cities/bucharest/v1/curated-pois.geojson ^
 *     --output cities/bucharest/v1/metadata.json
 */
const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const value = argv[i + 1];
    if (!value || value.startsWith('--')) {
      out[key] = true;
    } else {
      out[key] = value;
      i += 1;
    }
  }
  return out;
}

function usage() {
  console.log(
    [
      'Usage:',
      '  node scripts/generate-pack-metadata.js \\',
      '    --pmtiles path/to/{cityId}.pmtiles \\',
      '    --city-id bucharest \\',
      '    --version v1 \\',
      '    --center lon,lat,zoom \\',
      '    --bounds minLon,minLat,maxLon,maxLat \\',
      '    [--curated-pois cities/{cityId}/{version}/curated-pois.geojson]',
      '    [--streets-sqlite path/to/streets.sqlite]',
      '    [--output cities/{cityId}/{version}/metadata.json]',
      '',
      'Notes:',
      '  - Output defaults to <pmtiles-dir>/metadata.json',
      '  - Curated file is listed as curated-pois.geojson in metadata (exact basename the app expects).',
      '  - Optional streets.sqlite: include when you ship a pre-built DB in the same release (see README).',
    ].join('\n'),
  );
}

function parseCsvNumbers(value, expected, label) {
  const parts = String(value)
    .split(',')
    .map((p) => Number(p.trim()));
  if (parts.length !== expected || parts.some((n) => Number.isNaN(n))) {
    throw new Error(`Invalid ${label}. Expected ${expected} comma-separated numbers.`);
  }
  return parts;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args.h) {
    usage();
    process.exit(0);
  }

  const pmtilesPath = args['pmtiles'];
  const cityId = args['city-id'];
  const version = args['version'];
  const centerRaw = args['center'];
  const boundsRaw = args['bounds'];

  if (!pmtilesPath || !cityId || !version || !centerRaw || !boundsRaw) {
    usage();
    throw new Error(
      'Missing required args. Required: --pmtiles, --city-id, --version, --center, --bounds',
    );
  }

  const pmtilesAbs = path.resolve(pmtilesPath);
  if (!fs.existsSync(pmtilesAbs)) {
    throw new Error(`PMTiles file not found: ${pmtilesAbs}`);
  }
  const stat = fs.statSync(pmtilesAbs);
  const sizeBytes = stat.size;
  const pmtilesBase = path.basename(pmtilesAbs);

  const curatedArg = args['curated-pois'];
  let curatedEntry = null;
  if (curatedArg) {
    const curatedAbs = path.resolve(String(curatedArg));
    if (!fs.existsSync(curatedAbs)) {
      throw new Error(`curated-pois file not found: ${curatedAbs}`);
    }
    const cstat = fs.statSync(curatedAbs);
    curatedEntry = { path: 'curated-pois.geojson', sizeBytes: cstat.size };
  }

  const streetsArg = args['streets-sqlite'];
  let streetsEntry = null;
  if (streetsArg) {
    const streetsAbs = path.resolve(String(streetsArg));
    if (!fs.existsSync(streetsAbs)) {
      throw new Error(`streets.sqlite not found: ${streetsAbs}`);
    }
    const sstat = fs.statSync(streetsAbs);
    streetsEntry = { path: 'streets.sqlite', sizeBytes: sstat.size };
  }

  const [lon, lat, zoom] = parseCsvNumbers(centerRaw, 3, 'center');
  const [minLon, minLat, maxLon, maxLat] = parseCsvNumbers(boundsRaw, 4, 'bounds');

  const metadata = {
    cityId: String(cityId),
    version: String(version),
    center: { lon, lat, zoom },
    bounds: { minLon, minLat, maxLon, maxLat },
    files: [
      { path: pmtilesBase, sizeBytes },
      ...(curatedEntry ? [curatedEntry] : []),
      ...(streetsEntry ? [streetsEntry] : []),
    ],
  };

  const outputPath = args['output']
    ? path.resolve(args['output'])
    : path.join(path.dirname(pmtilesAbs), 'metadata.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(metadata, null, 2) + '\n', 'utf8');

  console.log(`Wrote metadata: ${outputPath}`);
  console.log(`${pmtilesBase} sizeBytes: ${sizeBytes}`);
  if (curatedEntry) {
    console.log(`curated-pois.geojson sizeBytes: ${curatedEntry.sizeBytes}`);
  }
  if (streetsEntry) {
    console.log(`streets.sqlite sizeBytes: ${streetsEntry.sizeBytes}`);
  }
}

main();
