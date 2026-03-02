import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: '',
    renderMode: RenderMode.Server,
  },
  {
    path: 'leagues/:leagueId/schedule',
    renderMode: RenderMode.Server,
  },
  {
    path: 'leagues/:leagueId/results',
    renderMode: RenderMode.Server,
  },
  {
    path: 'teams/:teamId',
    renderMode: RenderMode.Server,
  },
  {
    path: '**',
    renderMode: RenderMode.Client,
  },
];
