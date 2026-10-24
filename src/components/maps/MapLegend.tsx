import { useState } from 'react';
import { ChevronDown, ChevronUp, Map } from 'lucide-react';
import { COLORS } from './markers';

function Diamond({ c }: { c: string }) {
  return <span className="inline-block h-2.5 w-2.5 rotate-45 rounded-[2px]" style={{ background: c }} aria-hidden />;
}
function Square({ c }: { c: string }) {
  return <span className="inline-block h-3 w-3 rounded-[3px]" style={{ background: c }} aria-hidden />;
}
function Circle({ c }: { c: string }) {
  return <span className="inline-block h-3 w-3 rounded-full" style={{ background: c }} aria-hidden />;
}
function Line({ c, dashed }: { c: string; dashed?: boolean }) {
  return <span className="inline-block w-5 border-t-[3px]" style={{ borderColor: c, borderStyle: dashed ? 'dashed' : 'solid' }} aria-hidden />;
}

export function MapLegend({ showRoutes, showTraffic, showSignals, defaultOpen = false }: { showRoutes?: boolean; showTraffic?: boolean; showSignals?: boolean; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(() => defaultOpen && (typeof window === 'undefined' || window.innerWidth > 900));
  return (
    <div className="panel bg-surface/95 backdrop-blur shadow-lg text-[11px] w-52">
      <button className="w-full flex items-center justify-between px-3 py-2" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span className="flex items-center gap-1.5 label"><Map className="h-3.5 w-3.5" aria-hidden />Legend</span>
        {open ? <ChevronDown className="h-3.5 w-3.5 text-mute" /> : <ChevronUp className="h-3.5 w-3.5 text-mute" />}
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-1.5 text-mute">
          <div className="text-ink font-medium">Incidents (diamond)</div>
          <div className="grid grid-cols-2 gap-1">
            <span className="flex items-center gap-1.5"><Diamond c={COLORS.red} />Critical</span>
            <span className="flex items-center gap-1.5"><Diamond c={COLORS.amber} />High</span>
            <span className="flex items-center gap-1.5"><Diamond c={COLORS.blue} />Medium</span>
            <span className="flex items-center gap-1.5"><Diamond c={COLORS.mute} />Low</span>
          </div>
          <div className="text-ink font-medium pt-1">Ambulances (square)</div>
          <div className="grid grid-cols-2 gap-1">
            <span className="flex items-center gap-1.5"><Square c={COLORS.green} />Available</span>
            <span className="flex items-center gap-1.5"><Square c={COLORS.cyan} />Moving</span>
            <span className="flex items-center gap-1.5"><Square c={COLORS.blue} />Assigned</span>
            <span className="flex items-center gap-1.5"><Square c="#5b6878" />Offline</span>
          </div>
          <div className="text-ink font-medium pt-1">Hospitals (circle)</div>
          <div className="grid grid-cols-2 gap-1">
            <span className="flex items-center gap-1.5"><Circle c={COLORS.green} />Available</span>
            <span className="flex items-center gap-1.5"><Circle c={COLORS.amber} />Limited</span>
            <span className="flex items-center gap-1.5"><Circle c={COLORS.red} />Unavailable</span>
            <span className="flex items-center gap-1.5"><Circle c="#5b6878" />Unknown</span>
          </div>
          {showRoutes && (
            <>
              <div className="text-ink font-medium pt-1">Routes (simulated)</div>
              <span className="flex items-center gap-1.5"><Line c={COLORS.cyan} />Selected route</span>
              <span className="flex items-center gap-1.5"><Line c={COLORS.green} dashed />Recommended alt.</span>
              <span className="flex items-center gap-1.5"><Line c="#7c8ba0" dashed />Alternative</span>
              <span className="flex items-center gap-1.5"><Line c={COLORS.blue} dashed />Straight-line estimate</span>
            </>
          )}
          {showTraffic && (
            <>
              <div className="text-ink font-medium pt-1">Traffic (simulated)</div>
              <span className="flex items-center gap-1.5"><Line c={COLORS.green} />Free · <Line c={COLORS.amber} />Moderate · <Line c={COLORS.red} />Severe</span>
            </>
          )}
          {showSignals && (
            <>
              <div className="text-ink font-medium pt-1">Signal priority (demo)</div>
              <span className="flex items-center gap-1.5"><Square c={COLORS.green} />Approved <Square c={COLORS.amber} />Pending <Square c={COLORS.red} />Rejected</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
