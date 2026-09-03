import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FOOTER_SEARCH_LINKS } from '../../../core/constants/search-terms';

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
  protected popularSearches = FOOTER_SEARCH_LINKS;
}
