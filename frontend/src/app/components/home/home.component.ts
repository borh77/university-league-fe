import { Component, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

interface League {
  id: number;
  name: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent implements OnInit {
  private readonly http = inject(HttpClient);
  leagues: League[] = [];
  loading = true;
  error: string | null = null;

  ngOnInit(): void {
    this.http.get<League[]>('/api/public/leagues').subscribe({
      next: (leagues) => {
        this.leagues = leagues;
        this.loading = false;
      },
      error: () => {
        this.error = 'Greška pri učitavanju liga.';
        this.loading = false;
      },
    });
  }
}
