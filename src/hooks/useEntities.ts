import { useMemo } from 'react';
import { useApp } from '../context/store';
import { OPEN_STATUSES } from '../data/constants';

export function useMaps() {
  const incidents = useApp((s) => s.incidents);
  const ambulances = useApp((s) => s.ambulances);
  const hospitals = useApp((s) => s.hospitals);
  return useMemo(
    () => ({
      incById: Object.fromEntries(incidents.map((i) => [i.id, i])),
      ambById: Object.fromEntries(ambulances.map((a) => [a.id, a])),
      hspById: Object.fromEntries(hospitals.map((h) => [h.id, h])),
    }),
    [incidents, ambulances, hospitals],
  );
}

export function useOpenIncidents() {
  const incidents = useApp((s) => s.incidents);
  return useMemo(() => incidents.filter((i) => OPEN_STATUSES.includes(i.status)), [incidents]);
}
