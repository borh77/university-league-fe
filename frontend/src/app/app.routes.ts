import { Routes } from '@angular/router';
import { LeagueScheduleComponent } from './components/league-schedule/league-schedule.component';
import { TeamDetailComponent } from './components/team-detail/team-detail.component';
import { HomeComponent } from './components/home/home.component';

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
    pathMatch: 'full',
  },
  {
    path: 'leagues/:leagueId/schedule',
    component: LeagueScheduleComponent,
  },
  {
    path: 'teams/:teamId',
    component: TeamDetailComponent,
  },
];
