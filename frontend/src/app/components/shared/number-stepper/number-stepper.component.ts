import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-number-stepper',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './number-stepper.component.html',
  styleUrl: './number-stepper.component.css',
})
export class NumberStepperComponent {
  @Input() value = 0;
  @Input() min = 0;
  @Input() step = 1;
  @Input() label: string | null = null;

  @Output() valueChange = new EventEmitter<number>();

  decrement(): void {
    this.emit(this.value - this.step);
  }

  increment(): void {
    this.emit(this.value + this.step);
  }

  private emit(next: number): void {
    this.valueChange.emit(Math.max(this.min, next));
  }
}
