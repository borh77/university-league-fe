import { Routes } from '@angular/router';
import { LeagueScheduleComponent } from './components/league-schedule/league-schedule.component';
import { LeagueResultsComponent } from './components/league-results/league-results.component';
import { LeagueTopScorersComponent } from './components/league-top-scorers/league-top-scorers.component';
import { LeaguePlayoffComponent } from './components/league-playoff/league-playoff.component';
import { TeamDetailComponent } from './components/team-detail/team-detail.component';
import { HomeComponent } from './components/home/home.component';
import { LoginComponent } from './components/login/login.component';
import { DelegateEntryComponent } from './components/delegate-entry/delegate-entry.component';
import { AdminScheduleComponent } from './components/admin-schedule/admin-schedule.component';
import { roleGuard } from './guards/role.guard';

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
    path: 'leagues/:leagueId/results',
    component: LeagueResultsComponent,
  },
  {
    path: 'leagues/:leagueId/top-scorers',
    component: LeagueTopScorersComponent,
  },
  {
    path: 'leagues/:leagueId/playoff',
    component: LeaguePlayoffComponent,
  },
  {
    path: 'teams/:teamId',
    component: TeamDetailComponent,
  },
  {
    path: 'login',
    component: LoginComponent,
  },
  {
    path: 'leagues/:leagueId/delegate',
    component: DelegateEntryComponent,
    canActivate: [roleGuard(['Delegate', 'Admin'])],
  },
  {
    path: 'admin/schedule',
    component: AdminScheduleComponent,
    canActivate: [roleGuard(['Admin'])],
  },

];
