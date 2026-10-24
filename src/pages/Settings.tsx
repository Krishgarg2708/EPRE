import { useState } from 'react';
import { Palette, Map, SlidersHorizontal, Bell, FlaskConical, RotateCcw, Database, Ruler } from 'lucide-react';
import { PageHeader } from '../components/layout/Breadcrumbs';
import { Panel } from '../components/ui/Panel';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/Modal';
import { Segmented, Toggle, Field, Select } from '../components/ui/Form';
import { Disclaimer } from '../components/ui/Sim';
import { WeightsPanel } from '../components/routing/WeightsPanel';
import { useApp } from '../context/store';
import { toast } from '../context/toasts';
import { TILE_PROVIDERS } from '../data/mapConfig';
import type { ActivityCategory, LayerKey, Settings } from '../types';

const LAYERS: { k: LayerKey; label: string; desc: string }[] = [
  { k: 'incidents', label: 'Incidents', desc: 'Incident markers (diamonds)' },
  { k: 'ambulances', label: 'Ambulances', desc: 'Simulated unit positions' },
  { k: 'hospitals', label: 'Hospitals', desc: 'Hospital markers by availability' },
  { k: 'routes', label: 'Routes', desc: 'Selected and alternative route overlays' },
  { k: 'traffic', label: 'Traffic', desc: 'Simulated congestion segments' },
  { k: 'signals', label: 'Signal priority', desc: 'Demo intersections and request status' },
];
const NOTIFY: { k: ActivityCategory; label: string }[] = [
  { k: 'Incident', label: 'New incidents & edits' },
  { k: 'Assignment', label: 'Ambulance assignment' },
  { k: 'Routing', label: 'Route recalculation' },
  { k: 'Hospital', label: 'Hospital availability & pre-alerts' },
  { k: 'Signal', label: 'Simulated signal-priority results' },
  { k: 'Status', label: 'Incident status changes' },
];

export default function SettingsPage() {
  const settings = useApp((s) => s.settings);
  const update = useApp((s) => s.updateSettings);
  const resetSettings = useApp((s) => s.resetSettings);
  const resetDemo = useApp((s) => s.resetDemo);
  const nInc = useApp((s) => s.incidents.length);
  const nArc = useApp((s) => s.archive.length);
  const nNtf = useApp((s) => s.notifications.length);
  const counts = { incidents: nInc, archive: nArc, notifications: nNtf };
  const [confirm, setConfirm] = useState<'data' | 'settings' | null>(null);
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => update({ [k]: v } as Partial<Settings>);

  return (
    <div className="space-y-4">
      <PageHeader title="Settings" subtitle="Preferences are saved in this browser (localStorage). No patient data or credentials are stored." />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="Appearance" icon={<Palette className="h-4 w-4" />}>
          <div className="p-4 space-y-4">
            <Field label="Theme"><div><Segmented label="Theme" value={settings.theme} onChange={(v) => set('theme', v)} options={[{ value: 'dark', label: 'Dark (recommended)' }, { value: 'light', label: 'Light' }]} /></div></Field>
            <Field label="Table density"><div><Segmented label="Table density" value={settings.density} onChange={(v) => set('density', v)} options={[{ value: 'comfortable', label: 'Comfortable' }, { value: 'compact', label: 'Compact' }]} /></div></Field>
            <Toggle checked={settings.cursorTrail} onChange={(v) => set('cursorTrail', v)} label="Cursor trail" description="Fluid trail that follows the mouse. Large desktop screens only; off for touch devices and reduced motion." />
            <Toggle checked={settings.cursorGlow} onChange={(v) => set('cursorGlow', v)} label="Cursor glow" description="Soft ambient light behind the pointer. Same device rules as the trail." />
          </div>
        </Panel>

        <Panel title="Map" icon={<Map className="h-4 w-4" />}>
          <div className="p-4 space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Default map region" htmlFor="s-region">
                <Select id="s-region" value={settings.defaultRegion} onChange={(e) => set('defaultRegion', e.target.value as Settings['defaultRegion'])}>
                  {(['All NCR', 'New Delhi', 'Gurugram', 'Faridabad'] as const).map((r) => <option key={r}>{r}</option>)}
                </Select>
              </Field>
              <Field label="Base map" htmlFor="s-style">
                <Select id="s-style" value={settings.mapStyle} onChange={(e) => set('mapStyle', e.target.value as Settings['mapStyle'])}>
                  {Object.values(TILE_PROVIDERS).map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                </Select>
              </Field>
            </div>
            <div className="label pt-1">Layer visibility</div>
            <div className="divide-y divide-line/60">
              {LAYERS.map((l) => <Toggle key={l.k} checked={settings.layers[l.k]} onChange={(v) => set('layers', { ...settings.layers, [l.k]: v })} label={l.label} description={l.desc} />)}
            </div>
          </div>
        </Panel>

        <WeightsPanel />

        <Panel title="Units" icon={<Ruler className="h-4 w-4" />}>
          <div className="p-4">
            <Field label="Distance units"><div><Segmented label="Distance units" value={settings.units} onChange={(v) => set('units', v)} options={[{ value: 'km', label: 'Kilometres' }, { value: 'mi', label: 'Miles' }]} /></div></Field>
          </div>
        </Panel>

        <Panel title="Notifications" icon={<Bell className="h-4 w-4" />}>
          <div className="p-4 divide-y divide-line/60">
            <Toggle checked={settings.toasts} onChange={(v) => set('toasts', v)} label="Show toast pop-ups" description="Brief on-screen confirmations for actions and events." />
            {NOTIFY.map((n) => <Toggle key={n.k} checked={settings.notify[n.k]} onChange={(v) => set('notify', { ...settings.notify, [n.k]: v })} label={n.label} description="Add to the notification centre" />)}
          </div>
        </Panel>

        <Panel title="Demo simulation" icon={<FlaskConical className="h-4 w-4" />}>
          <div className="p-4 space-y-3">
            <Field label="Simulation mode">
              <div><Segmented label="Simulation mode" value={settings.simulationMode} onChange={(v) => { set('simulationMode', v); toast(v === 'auto' ? 'Auto-progress enabled (demo)' : 'Manual mode', v === 'auto' ? 'One active incident advances one workflow step every 15 seconds.' : 'Incidents only change on operator action.', 'info'); }} options={[{ value: 'manual', label: 'Manual (default)' }, { value: 'auto', label: 'Auto-progress (demo)' }]} /></div>
            </Field>
            <p className="text-xs text-mute">Manual mode changes incidents only on operator actions. Auto-progress is a clearly labelled demo aid that advances one assigned incident by one workflow step every 15 seconds, using deterministic rules.</p>
            <Disclaimer>EPRE is a prototype. It is not a certified emergency-response system and is not connected to real ambulances, hospitals or traffic signals.</Disclaimer>
          </div>
        </Panel>

        <Panel title="Demo data" icon={<Database className="h-4 w-4" />} className="lg:col-span-2">
          <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="text-sm text-mute">
              Current dataset: <span className="text-ink">{counts.incidents}</span> live demo incidents, <span className="text-ink">{counts.archive}</span> archived demo records, <span className="text-ink">{counts.notifications}</span> notifications.
              <div className="text-xs mt-1">The optional demo contact field is kept in memory only and never written to browser storage.</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button icon={<SlidersHorizontal className="h-3.5 w-3.5" />} onClick={() => setConfirm('settings')}>Reset preferences</Button>
              <Button variant="danger" icon={<RotateCcw className="h-3.5 w-3.5" />} onClick={() => setConfirm('data')}>Reset to Demo Defaults</Button>
            </div>
          </div>
        </Panel>
      </div>

      <ConfirmDialog
        open={confirm !== null}
        tone="danger"
        title={confirm === 'data' ? 'Reset demo data?' : 'Reset preferences?'}
        confirmLabel={confirm === 'data' ? 'Reset to Demo Defaults' : 'Reset preferences'}
        body={confirm === 'data' ? 'Restores the original seeded incidents, fleet, hospitals, signal requests, activity and notifications. Your preferences are kept.' : 'Restores theme, map, weights, units, density and notification preferences to defaults. Demo data is kept.'}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (confirm === 'data') resetDemo();
          else { resetSettings(); toast('Preferences reset', undefined, 'success'); }
          setConfirm(null);
        }}
      />
    </div>
  );
}
