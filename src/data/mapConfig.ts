/**
 * Replaceable map tile configuration. Swap these entries to integrate a different provider.
 * Public OSM/CARTO tiles are used for low-volume demonstration only; respect their usage policies.
 */
export interface TileProvider {
  id: 'dark' | 'standard';
  label: string;
  url: string;
  attribution: string;
  maxZoom: number;
}

export const TILE_PROVIDERS: Record<TileProvider['id'], TileProvider> = {
  dark: {
    id: 'dark',
    label: 'Dark (CARTO)',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 19,
  },
  standard: {
    id: 'standard',
    label: 'Standard (OpenStreetMap)',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
};
