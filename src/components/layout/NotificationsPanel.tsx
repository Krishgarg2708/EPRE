import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Circle, CircleDot } from 'lucide-react';
import { useApp } from '../../context/store';
import type { ActivityCategory } from '../../types';
import { timeAgo } from '../../utils/format';
import { cn } from '../../utils/cn';
import { refPath } from './refLink';
import { EmptyState } from '../ui/Panel';
import { useNow } from '../../hooks/useNow';

const CATS: (ActivityCategory | 'All' | 'Unread')[] = ['All', 'Unread', 'Incident', 'Assignment', 'Routing', 'Hospital', 'Signal', 'Status'];

export function NotificationsButton() {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<(typeof CATS)[number]>('All');
  const notifications = useApp((s) => s.notifications);
  const markRead = useApp((s) => s.markRead);
  const markAllRead = useApp((s) => s.markAllRead);
  const unread = notifications.filter((n) => !n.read).length;
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const now = useNow(30000);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const list = useMemo(
    () => notifications.filter((n) => (filter === 'All' ? true : filter === 'Unread' ? !n.read : n.category === filter)),
    [notifications, filter],
  );

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((v) => !v)} aria-label={`Notifications, ${unread} unread`} aria-expanded={open} className="relative h-9 w-9 grid place-items-center rounded-md text-mute hover:text-ink hover:bg-card">
        <Bell className="h-[18px] w-[18px]" />
        {unread > 0 && <span className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-red text-white text-[10px] font-semibold grid place-items-center tabular-nums">{unread > 99 ? '99+' : unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-[min(400px,calc(100vw-1.5rem))] panel bg-surface shadow-2xl z-[750] flex flex-col max-h-[70vh]" role="dialog" aria-label="Notifications">
          <div className="flex items-center justify-between px-4 py-3 border-b border-line">
            <div>
              <h2 className="text-sm font-semibold">Notifications</h2>
              <p className="text-[11px] text-mute">{unread} unread · generated from demo state changes</p>
            </div>
            <button onClick={markAllRead} disabled={unread === 0} className="text-xs text-cyan hover:underline disabled:opacity-40 disabled:no-underline flex items-center gap-1">
              <CheckCheck className="h-3.5 w-3.5" aria-hidden />Mark all read
            </button>
          </div>
          <div className="flex gap-1 px-3 py-2 border-b border-line overflow-x-auto scroll-thin" role="tablist" aria-label="Filter notifications">
            {CATS.map((c) => (
              <button key={c} role="tab" aria-selected={filter === c} onClick={() => setFilter(c)} className={cn('px-2 h-6 rounded text-[11px] whitespace-nowrap', filter === c ? 'bg-cyan/15 text-cyan' : 'text-mute hover:text-ink')}>{c}</button>
            ))}
          </div>
          <ul className="overflow-y-auto scroll-thin flex-1">
            {list.length === 0 && <li><EmptyState title="No notifications" body="Nothing matches this filter." /></li>}
            {list.map((n) => (
              <li key={n.id} className={cn('flex gap-2 px-3 py-2.5 border-b border-line/60 hover:bg-card', !n.read && 'bg-cyan/[0.04]')}>
                <button onClick={() => markRead(n.id, !n.read)} aria-label={n.read ? 'Mark as unread' : 'Mark as read'} title={n.read ? 'Mark as unread' : 'Mark as read'} className="mt-0.5 text-cyan shrink-0 h-5 w-5 grid place-items-center">
                  {n.read ? <Circle className="h-3 w-3 text-mute" /> : <CircleDot className="h-3.5 w-3.5" />}
                </button>
                <button
                  className="text-left min-w-0 flex-1"
                  onClick={() => {
                    markRead(n.id, true);
                    const p = refPath(n.ref);
                    if (p) { navigate(p); setOpen(false); }
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn('text-[13px] truncate', !n.read ? 'font-semibold' : 'text-ink/85')}>{n.title}</span>
                    <span className="text-[10px] text-mute shrink-0">{timeAgo(n.at, now)}</span>
                  </div>
                  <div className="text-xs text-mute truncate">{n.body}</div>
                  <div className="text-[10px] text-mute/80 mt-0.5 uppercase tracking-wider">{n.category}</div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
