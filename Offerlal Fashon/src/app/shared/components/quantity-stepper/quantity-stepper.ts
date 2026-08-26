import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-quantity-stepper',
  standalone: true,
  templateUrl: './quantity-stepper.html',
  styleUrl: './quantity-stepper.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuantityStepper {
  quantity = input.required<number>();
  min = input(1);
  max = input(10);
  quantityChange = output<number>();

  protected decrement(): void {
    if (this.quantity() > this.min()) this.quantityChange.emit(this.quantity() - 1);
  }

  protected increment(): void {
    if (this.quantity() < this.max()) this.quantityChange.emit(this.quantity() + 1);
  }
}
