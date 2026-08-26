import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'inr' })
export class InrCurrencyPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    if (value == null || isNaN(value)) return '';
    return '₹' + Math.round(value).toLocaleString('en-IN');
  }
}
