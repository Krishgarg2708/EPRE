import { useEffect, useMemo, useState } from 'react';
import { Ambulance as AmbIcon, Ban } from 'lucide-react';
import type { Incident } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { AmbulanceStatusBadge, Badge, PriorityBadge } from '../ui/Badges';
import { Disclaimer } from '../ui/Sim';
import { useApp } from '../../context/store';
import { rankAmbulances } from '../../utils/recommend';
import { toast } from '../../context/toasts';
import { cn } from '../../utils/cn';
import { fmtDistance } from '../../utils/format';

export function AssignAmbulanceModal({ incident, open, onClose, preselect }: { incident: Incident | undefined; open: boolean; onClose: () => void; preselect?: string }) {
  const ambulances = useApp((s) => s.ambulances);
  const assign = useApp((s) => s.assignAmbulance);
  const units = useApp((s) => s.settings.units);
  const ranked = useMemo(() => (incident ? rankAmbulances(incident, ambulances) : []), [incident, ambulances]);
  const [sel, setSel] = useState<string | null>(null);
  useEffect(() => {
    if (open) setSel(preselect ?? ranked.find((r) => r.available)?.ambulance.id ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, preselect]);
  if (!incident) return null;
  const chosen = ranked.find((r) => r.ambulance.id === sel);
  const confirm = () => {
    if (!sel) return;
    const res = assign(incident.id, sel);
    if (!res.ok) toast('Assignment blocked', res.error, 'danger');
    else onClose();
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={`Assign ambulance — ${incident.id}`}
      description={<span className="inline-flex items-center gap-2"><PriorityBadge p={incident.priority} /> {incident.type} · {incident.location}</span>}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={confirm} disabled={!chosen?.available}>{chosen ? `Confirm ${chosen.ambulance.id}` : 'Select a unit'}</Button>
        </>
      }
    >
      <p className="text-xs text-mute mb-3">Units are ranked by simulated straight-line ETA (× road factor). ALS units are preferred for Critical/High priority. Unavailable units cannot be selected.</p>
      <ul className="space-y-1.5" role="radiogroup" aria-label="Ambulances">
        {ranked.map((r, idx) => (
          <li key={r.ambulance.id}>
            <button
              role="radio"
              aria-checked={sel === r.ambulance.id}
              disabled={!r.available}
              onClick={() => setSel(r.ambulance.id)}
              className={cn(
                'w-full flex items-center gap-3 rounded-md border px-3 py-2 text-left transition-colors',
                sel === r.ambulance.id ? 'border-cyan bg-cyan/[0.06]' : 'border-line hover:bg-card',
                !r.available && 'opacity-50 cursor-not-allowed hover:bg-transparent',
              )}
            >
              {r.available ? <AmbIcon className="h-4 w-4 text-green shrink-0" aria-hidden /> : <Ban className="h-4 w-4 text-mute shrink-0" aria-hidden />}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-[13px]">
                  <span className="font-mono">{r.ambulance.id}</span>
                  <span className="text-mute">{r.ambulance.callSign}</span>
                  <Badge tone={r.ambulance.type === 'ALS' ? 'cyan' : 'mute'}>{r.ambulance.type}</Badge>
                  {idx === 0 && r.available && <Badge tone="green">Suggested</Badge>}
                </div>
                <div className="text-[11px] text-mute truncate">{r.reason} · {r.ambulance.base}</div>
              </div>
              <div className="text-right shrink-0">
                {r.available ? (
                  <>
                    <div className="text-[13px] tabular-nums">~{Math.round(r.minutes)} min</div>
                    <div className="text-[10px] text-mute">{fmtDistance(r.roadKm, units)} est.</div>
                  </>
                ) : (
                  <AmbulanceStatusBadge s={r.ambulance.status} />
                )}
              </div>
            </button>
          </li>
        ))}
      </ul>
      {incident.ambulanceId && <p className="text-xs text-amber mt-3">Currently assigned: {incident.ambulanceId}. Confirming will release it back to Available.</p>}
      <Disclaimer className="mt-3">Simulated assignment. No real vehicle is dispatched.</Disclaimer>
    </Modal>
  );
}
