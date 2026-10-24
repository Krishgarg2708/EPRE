import type { ReactNode } from 'react';
import {
  AlertOctagon, AlertTriangle, ArrowDownCircle, ArrowUpCircle, CheckCircle2, CircleDot, CircleHelp, Clock, Loader, MinusCircle,
  Navigation, Siren, Truck, Wrench, WifiOff, XCircle, Hospital as HospitalIcon, PlusCircle, Flag, UserCheck, Send, Hourglass, Ban,
} from 'lucide-react';
import type { AmbulanceStatus, Availability, IncidentStatus, Priority, SignalRequestStatus } from '../../types';
import { cn } from '../../utils/cn';

export type Tone = 'red' | 'amber' | 'green' | 'blue' | 'cyan' | 'mute';

const toneCls: Record<Tone, string> = {
  red: 'text-red bg-red/10 border-red/30',
  amber: 'text-amber bg-amber/10 border-amber/30',
  green: 'text-green bg-green/10 border-green/30',
  blue: 'text-blue bg-blue/10 border-blue/30',
  cyan: 'text-cyan bg-cyan/10 border-cyan/30',
  mute: 'text-mute bg-mute/10 border-line',
};

export function Badge({ tone = 'mute', icon, children, className }: { tone?: Tone; icon?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-medium leading-none whitespace-nowrap', toneCls[tone], className)}>
      {icon}
      {children}
    </span>
  );
}

const ic = 'h-3 w-3 shrink-0';

export const PRIORITY_TONE: Record<Priority, Tone> = { Critical: 'red', High: 'amber', Medium: 'blue', Low: 'mute' };
const PRIORITY_ICON: Record<Priority, ReactNode> = {
  Critical: <AlertOctagon className={ic} aria-hidden />,
  High: <ArrowUpCircle className={ic} aria-hidden />,
  Medium: <MinusCircle className={ic} aria-hidden />,
  Low: <ArrowDownCircle className={ic} aria-hidden />,
};
export function PriorityBadge({ p }: { p: Priority }) {
  return <Badge tone={PRIORITY_TONE[p]} icon={PRIORITY_ICON[p]}>{p}</Badge>;
}

const INC: Record<IncidentStatus, [Tone, ReactNode]> = {
  New: ['cyan', <PlusCircle className={ic} aria-hidden key="i" />],
  'Awaiting Assignment': ['amber', <Hourglass className={ic} aria-hidden key="i" />],
  Assigned: ['blue', <UserCheck className={ic} aria-hidden key="i" />],
  Dispatched: ['blue', <Send className={ic} aria-hidden key="i" />],
  'En Route': ['cyan', <Navigation className={ic} aria-hidden key="i" />],
  'At Pickup': ['amber', <Flag className={ic} aria-hidden key="i" />],
  Transporting: ['cyan', <Siren className={ic} aria-hidden key="i" />],
  'Arrived at Hospital': ['green', <HospitalIcon className={ic} aria-hidden key="i" />],
  Completed: ['green', <CheckCircle2 className={ic} aria-hidden key="i" />],
  Cancelled: ['mute', <Ban className={ic} aria-hidden key="i" />],
};
export function IncidentStatusBadge({ s }: { s: IncidentStatus }) {
  return <Badge tone={INC[s][0]} icon={INC[s][1]}>{s}</Badge>;
}

const AMB: Record<AmbulanceStatus, [Tone, ReactNode]> = {
  Available: ['green', <CheckCircle2 className={ic} aria-hidden key="i" />],
  Assigned: ['blue', <UserCheck className={ic} aria-hidden key="i" />],
  'En Route to Pickup': ['cyan', <Navigation className={ic} aria-hidden key="i" />],
  'At Pickup': ['amber', <Flag className={ic} aria-hidden key="i" />],
  'Transporting Patient': ['cyan', <Truck className={ic} aria-hidden key="i" />],
  'At Hospital': ['blue', <HospitalIcon className={ic} aria-hidden key="i" />],
  Offline: ['mute', <WifiOff className={ic} aria-hidden key="i" />],
  Maintenance: ['amber', <Wrench className={ic} aria-hidden key="i" />],
};
export function AmbulanceStatusBadge({ s }: { s: AmbulanceStatus }) {
  return <Badge tone={AMB[s][0]} icon={AMB[s][1]}>{s}</Badge>;
}
export const AMB_TONE = (s: AmbulanceStatus) => AMB[s][0];

const AV: Record<Availability, [Tone, ReactNode]> = {
  Available: ['green', <CheckCircle2 className={ic} aria-hidden key="i" />],
  'Limited Capacity': ['amber', <AlertTriangle className={ic} aria-hidden key="i" />],
  Unavailable: ['red', <XCircle className={ic} aria-hidden key="i" />],
  Unknown: ['mute', <CircleHelp className={ic} aria-hidden key="i" />],
};
export function AvailabilityBadge({ s }: { s: Availability }) {
  return <Badge tone={AV[s][0]} icon={AV[s][1]}>{s}</Badge>;
}
export const AV_TONE = (s: Availability) => AV[s][0];

const SG: Record<SignalRequestStatus, [Tone, ReactNode, string]> = {
  'Not Requested': ['mute', <CircleDot className={ic} aria-hidden key="i" />, 'Not requested'],
  'Simulated Request Pending': ['amber', <Loader className={ic} aria-hidden key="i" />, 'Sim. pending'],
  'Simulated Request Approved': ['green', <CheckCircle2 className={ic} aria-hidden key="i" />, 'Sim. approved'],
  'Simulated Request Rejected': ['red', <XCircle className={ic} aria-hidden key="i" />, 'Sim. rejected'],
  'Simulated Request Expired': ['mute', <Clock className={ic} aria-hidden key="i" />, 'Sim. expired'],
};
export function SignalBadge({ s, short }: { s: SignalRequestStatus; short?: boolean }) {
  return <Badge tone={SG[s][0]} icon={SG[s][1]}>{short ? SG[s][2] : s}</Badge>;
}

export const TONE_HEX: Record<Tone, string> = {
  red: 'rgb(var(--red))',
  amber: 'rgb(var(--amber))',
  green: 'rgb(var(--green))',
  blue: 'rgb(var(--blue))',
  cyan: 'rgb(var(--cyan))',
  mute: 'rgb(var(--mute))',
};
