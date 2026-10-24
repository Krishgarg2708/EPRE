import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Siren, CheckCircle2, Navigation, Timer, Hospital, Radio } from 'lucide-react';
import { MetricCard } from '../ui/MetricCard';
import { useApp } from '../../context/store';
import { OPEN_STATUSES } from '../../data/constants';

export function MetricsRow() {
  const incidents = useApp((s) => s.incidents);
  const archive = useApp((s) => s.archive);
  const ambulances = useApp((s) => s.ambulances);
  const hospitals = useApp((s) => s.hospitals);
  const signals = useApp((s) => s.signalRequests);
  const navigate = useNavigate();

  const m = useMemo(() => {
    const open = incidents.filter((i) => OPEN_STATUSES.includes(i.status));
    const critical = open.filter((i) => i.priority === 'Critical').length;
    const unassigned = open.filter((i) => i.status === 'New' || i.status === 'Awaiting Assignment').length;
    const available = ambulances.filter((a) => a.status === 'Available').length;
    const enRoute = ambulances.filter((a) => a.status === 'En Route to Pickup' || a.status === 'Transporting Patient').length;
    const dayAgo = Date.now() - 86400000;
    const responses = [...incidents, ...archive].filter((i) => i.responseMin !== undefined && new Date(i.createdAt).getTime() >= dayAgo).map((i) => i.responseMin as number);
    const avgResp = responses.length ? responses.reduce((a, b) => a + b, 0) / responses.length : null;
    const hAvail = hospitals.filter((h) => h.edStatus === 'Available').length;
    const hUnknown = hospitals.filter((h) => h.edStatus === 'Unknown').length;
    const pendingSignals = signals.filter((s) => s.status === 'Simulated Request Pending').length;
    const needsHospital = open.filter((i) => i.ambulanceId && !i.hospitalId).length;
    return { open: open.length, critical, unassigned, available, enRoute, avgResp, responses: responses.length, hAvail, hUnknown, pending: pendingSignals + unassigned + needsHospital, pendingSignals, needsHospital, fleet: ambulances.length };
  }, [incidents, archive, ambulances, hospitals, signals]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
      <MetricCard index={0} label="Active Incidents" value={m.open} icon={<Siren className="h-4 w-4" />} tone="red" alert={m.critical > 0} sub={`${m.critical} critical · ${m.unassigned} unassigned`} onClick={() => navigate('/incidents')} />
      <MetricCard index={1} label="Available Ambulances" value={m.available} unit={`/ ${m.fleet}`} icon={<CheckCircle2 className="h-4 w-4" />} tone="green" sub="Status = Available" onClick={() => navigate('/fleet')} />
      <MetricCard index={2} label="Ambulances En Route" value={m.enRoute} icon={<Navigation className="h-4 w-4" />} tone="cyan" sub="To pickup or hospital" onClick={() => navigate('/map')} />
      <MetricCard index={3} label="Avg Sim. Response" value={m.avgResp === null ? '—' : m.avgResp.toFixed(1)} unit="min" icon={<Timer className="h-4 w-4" />} tone="blue" sub={`Last 24h · ${m.responses} demo records`} tip="Average simulated dispatch-to-pickup time across demo records in the last 24 hours. Not a measured real-world value." onClick={() => navigate('/analytics')} />
      <MetricCard index={4} label="Hospitals Available" value={m.hAvail} unit={`/ ${hospitals.length}`} icon={<Hospital className="h-4 w-4" />} tone="green" sub={`${m.hUnknown} unknown · simulated feed`} tip="Hospitals whose simulated ED status is Available. Unknown capacity is never counted as available." onClick={() => navigate('/hospitals')} />
      <MetricCard index={5} label="Pending Coordination" value={m.pending} icon={<Radio className="h-4 w-4" />} tone="amber" sub={`${m.unassigned} assign · ${m.needsHospital} hospital · ${m.pendingSignals} signal`} tip="Unassigned incidents + assigned incidents without a destination hospital + pending simulated signal requests." onClick={() => navigate('/incidents')} />
    </div>
  );
}
