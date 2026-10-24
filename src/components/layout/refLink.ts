import type { EntityRef } from '../../types';

export function refPath(ref?: EntityRef): string | null {
  if (!ref) return null;
  switch (ref.kind) {
    case 'incident':
      return `/incidents/${ref.id}`;
    case 'ambulance':
      return `/fleet?id=${ref.id}`;
    case 'hospital':
      return `/hospitals?id=${ref.id}`;
    case 'signal':
      return `/traffic`;
  }
}
