import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-team-detail',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="team-detail-container">
      <h2>Tim #{{ teamId }}</h2>
      <p>Detalji tima biće implementirani u narednoj iteraciji.</p>
    </div>
  `,
  styles: [
    `
      .team-detail-container {
        max-width: 800px;
        margin: 2rem auto;
        padding: 0 1rem;
        font-family: sans-serif;
      }
    `,
  ],
})
export class TeamDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  teamId: number | null = null;

  ngOnInit(): void {
    this.teamId = Number(this.route.snapshot.paramMap.get('teamId'));
  }
}
