import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Siren, UserCheck, Route, Hospital, TrafficCone, RefreshCw, Cog } from 'lucide-react';
import { Panel, EmptyState } from '../ui/Panel';
import { useApp } from '../../context/store';
import type { ActivityCategory } from '../../types';
import { fmtTime, timeAgo } from '../../utils/format';
import { refPath } from '../layout/refLink';
import { cn } from '../../utils/cn';
import { useNow } from '../../hooks/useNow';

const ICON: Record<ActivityCategory, typeof Siren> = { Incident: Siren, Assignment: UserCheck, Routing: Route, Hospital, Signal: TrafficCone, Status: RefreshCw, System: Cog };
const TONE: Record<ActivityCategory, string> = { Incident: 'text-red', Assignment: 'text-green', Routing: 'text-cyan', Hospital: 'text-blue', Signal: 'text-amber', Status: 'text-mute', System: 'text-mute' };

export function ActivityFeed({ limit = 14, className, filterIncident }: { limit?: number; className?: string; filterIncident?: string }) {
  const activities = useApp((s) => s.activities);
  const [cat, setCat] = useState<ActivityCategory | 'All'>('All');
  const navigate = useNavigate();
  const now = useNow(30000);
  const list = useMemo(
    () => activities.filter((a) => (cat === 'All' || a.category === cat) && (!filterIncident || a.ref?.id === filterIncident || a.message.includes(filterIncident))).slice(0, limit),
    [activities, cat, limit, filterIncident],
  );
  return (
    <Panel
      title="Recent Activity"
      icon={<Activity className="h-4 w-4" />}
      className={className}
      actions={
        <select value={cat} onChange={(e) => setCat(e.target.value as ActivityCategory | 'All')} className="h-7 rounded bg-bg/60 border border-line text-[11px] px-1.5" aria-label="Filter activity by category">
          {['All', 'Incident', 'Assignment', 'Routing', 'Hospital', 'Signal', 'Status'].map((c) => <option key={c}>{c}</option>)}
        </select>
      }
      bodyClass="overflow-y-auto scroll-thin"
    >
      {list.length === 0 ? (
        <EmptyState title="No activity yet" body="Events appear here as you work with incidents." />
      ) : (
        <ol className="relative px-4 py-2">
          {list.map((a) => {
            const I = ICON[a.category];
            const p = refPath(a.ref);
            return (
              <li key={a.id} className="relative flex gap-3 py-2">
                <span className={cn('mt-0.5 h-6 w-6 shrink-0 rounded-md bg-card border border-line grid place-items-center', TONE[a.category])}><I className="h-3.5 w-3.5" aria-hidden /></span>
                <div className="min-w-0 flex-1">
                  {p ? (
                    <button onClick={() => navigate(p)} className="text-[12.5px] text-left hover:text-cyan leading-snug">{a.message}</button>
                  ) : (
                    <p className="text-[12.5px] leading-snug">{a.message}</p>
                  )}
                  <div className="text-[10.5px] text-mute mt-0.5 flex gap-2">
                    <span className="font-mono">{fmtTime(a.at)}</span>
                    <span>{timeAgo(a.at, now)}</span>
                    <span className="uppercase tracking-wider">{a.category}</span>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Panel>
  );
}
