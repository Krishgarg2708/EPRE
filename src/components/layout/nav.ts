import { LayoutDashboard, Map, Siren, Route, Ambulance, Hospital, TrafficCone, BarChart3, Settings } from 'lucide-react';

export const NAV = [
  { to: '/', label: 'Command Center', icon: LayoutDashboard },
  { to: '/map', label: 'Live Operations Map', icon: Map },
  { to: '/incidents', label: 'Emergency Incidents', icon: Siren },
  { to: '/routes', label: 'Route Intelligence', icon: Route },
  { to: '/fleet', label: 'Ambulance Fleet', icon: Ambulance },
  { to: '/hospitals', label: 'Hospital Network', icon: Hospital },
  { to: '/traffic', label: 'Traffic & Signal Priority', icon: TrafficCone },
  { to: '/analytics', label: 'Analytics & Reports', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
] as const;
