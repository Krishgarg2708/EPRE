import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import type { Incident } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { AvailabilityBadge, Badge } from '../ui/Badges';
import { Disclaimer } from '../ui/Sim';
import { useApp } from '../../context/store';
import { rankHospitals } from '../../utils/recommend';
import { toast } from '../../context/toasts';
import { cn } from '../../utils/cn';
import { REQUIRED_CAPABILITY } from '../../data/constants';

export function HospitalPickerModal({ incident, open, onClose }: { incident: Incident | undefined; open: boolean; onClose: () => void }) {
  const hospitals = useApp((s) => s.hospitals);
  const setHospital = useApp((s) => s.setHospital);
  const ranked = useMemo(() => (incident ? rankHospitals(incident, hospitals) : []), [incident, hospitals]);
  const [sel, setSel] = useState<string | null>(null);
  useEffect(() => {
    if (open) setSel(incident?.hospitalId ?? ranked.find((r) => r.eligible)?.hospital.id ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  if (!incident) return null;
  const confirm = () => {
    if (!sel) return;
    const res = setHospital(incident.id, sel);
    if (!res.ok) toast('Cannot select hospital', res.error, 'danger');
    else onClose();
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={`Select destination hospital — ${incident.id}`}
      description={`Needs: ${REQUIRED_CAPABILITY[incident.type].join(' or ')} · ranked by capability match, simulated availability and estimated travel time`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={confirm} disabled={!sel || ranked.find((r) => r.hospital.id === sel)?.eligible === false}>Confirm & prepare pre-alert</Button>
        </>
      }
    >
      <ul className="space-y-1.5" role="radiogroup" aria-label="Hospitals">
        {ranked.map((r, idx) => (
          <li key={r.hospital.id}>
            <button
              role="radio"
              aria-checked={sel === r.hospital.id}
              disabled={!r.eligible}
              onClick={() => setSel(r.hospital.id)}
              className={cn('w-full rounded-md border px-3 py-2.5 text-left transition-colors', sel === r.hospital.id ? 'border-cyan bg-cyan/[0.06]' : 'border-line hover:bg-card', !r.eligible && 'opacity-50 cursor-not-allowed')}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[13px] font-medium">{r.hospital.name}</span>
                <AvailabilityBadge s={r.hospital.edStatus} />
                {idx === 0 && r.eligible && <Badge tone="green">Top suggestion</Badge>}
                {incident.requestedHospitalId === r.hospital.id && <Badge tone="blue">Requested</Badge>}
                <span className="ml-auto text-[12px] tabular-nums text-ink">~{Math.round(r.minutes)} min</span>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
                {r.reasons.map((x) => <span key={x} className="flex items-center gap-1 text-mute"><CheckCircle2 className="h-3 w-3 text-green" aria-hidden />{x}</span>)}
                {r.warnings.map((x) => <span key={x} className="flex items-center gap-1 text-amber"><AlertTriangle className="h-3 w-3" aria-hidden />{x}</span>)}
              </div>
            </button>
          </li>
        ))}
      </ul>
      <Disclaimer className="mt-3">Decision support only — not clinical triage. Capacity figures are simulated; confirm with the receiving facility through official channels.</Disclaimer>
    </Modal>
  );
}
