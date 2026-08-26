import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

const POPULAR_SEARCHES = [
  'Bridal Lehenga',
  'Wedding Saree',
  'Party Wear Lehenga',
  'Anarkali Suit',
  'Sharara Set',
  'Bridal Jewellery',
  'Reception Gown',
  'Sangeet Outfit',
  'Kids Ethnic Wear',
  'Banarasi Saree',
  'Kundan Choker',
  'Mehendi Dress',
];

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './footer.html',
  styleUrl: './footer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Footer {
  protected year = new Date().getFullYear();
  protected popularSearches = POPULAR_SEARCHES;
}
