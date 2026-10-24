import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Radar } from 'lucide-react';
import { MetricsRow } from '../components/dashboard/Metrics';
import { ActivityFeed } from '../components/dashboard/ActivityFeed';
import { RouteRecommendation } from '../components/routing/RouteRecommendation';
import { IncidentQueue } from '../components/incidents/IncidentQueue';
import { OpsMap } from '../components/maps/OpsMap';
import { IncidentCard, AmbulanceCard } from '../components/maps/SelectionCard';
import { PageHeader } from '../components/layout/Breadcrumbs';
import { Disclaimer } from '../components/ui/Sim';
import { useApp } from '../context/store';
import { useOpenIncidents } from '../hooks/useEntities';
import { useRoutes, useEtas } from '../hooks/useRoutes';

export default function CommandCenter() {
  const open = useOpenIncidents();
  const ambulances = useApp((s) => s.ambulances);
  const hospitals = useApp((s) => s.hospitals);
  const incidents = useApp((s) => s.incidents);
  const selectedId = useApp((s) => s.selectedIncidentId);
  const selectedAmbId = useApp((s) => s.selectedAmbulanceId);
  const selectIncident = useApp((s) => s.selectIncident);
  const selectAmbulance = useApp((s) => s.selectAmbulance);
  const selectRoute = useApp((s) => s.selectRoute);
  const navigate = useNavigate();
  const incident = incidents.find((i) => i.id === selectedId);
  const analysis = useRoutes(incident);
  const selAmb = ambulances.find((a) => a.id === selectedAmbId);
  const etaList = useMemo(() => [incident, ...(selAmb?.incidentId ? [incidents.find((i) => i.id === selAmb.incidentId)] : [])].filter((x): x is NonNullable<typeof x> => !!x), [incident, selAmb, incidents]);
  const etas = useEtas(etaList);
  const hsp = hospitals.find((h) => h.id === incident?.hospitalId);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Command Center"
        subtitle="Live overview of simulated incidents, units, routes and hospital coordination across Delhi NCR."
      />
      <MetricsRow />
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className="xl:col-span-8 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="panel-title"><Radar className="h-4 w-4 text-cyan" aria-hidden />Geospatial Operations View</h2>
            <span className="text-[11px] text-mute">{open.length} active incidents · {ambulances.length} units · {hospitals.length} hospitals</span>
          </div>
          <OpsMap
            className="h-[420px] sm:h-[520px] xl:h-[600px]"
            incidents={open}
            ambulances={ambulances}
            hospitals={hospitals}
            routes={analysis?.routes}
            selectedRouteId={analysis?.selected.id}
            onSelectRoute={(r) => incident && selectRoute(incident.id, r)}
            hospitalLeg={incident && hsp && analysis?.leg === 'pickup' ? { from: incident.coords, to: hsp.coords, label: `${incident.id} → ${hsp.name}` } : null}
            selectedIncidentId={selectedId}
            selectedAmbulanceId={selectedAmbId}
            selectedHospitalId={incident?.hospitalId}
            onSelectIncident={selectIncident}
            onSelectAmbulance={selectAmbulance}
            onSelectHospital={(id) => navigate(`/hospitals?id=${id}`)}
            signalIncidentId={selectedId}
            overlay={
              <div className="flex flex-col gap-2">
                {selAmb ? (
                  <AmbulanceCard amb={selAmb} eta={selAmb.incidentId ? etas[selAmb.incidentId] : undefined} onClose={() => selectAmbulance(null)} />
                ) : incident ? (
                  <IncidentCard inc={incident} eta={etas[incident.id]} onClose={() => selectIncident(null)} />
                ) : null}
              </div>
            }
          />
        </div>
        <RouteRecommendation className="xl:col-span-4 xl:max-h-[634px]" />
        <IncidentQueue className="xl:col-span-8 max-h-[520px]" />
        <ActivityFeed className="xl:col-span-4 max-h-[520px]" />
      </div>
      <Disclaimer>
        EPRE is a frontend prototype running on simulated data. It does not dispatch ambulances, control traffic signals or read real hospital capacity, and it must not be used for real emergency response.
      </Disclaimer>
    </div>
  );
}
