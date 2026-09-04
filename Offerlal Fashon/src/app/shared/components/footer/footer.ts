import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { NavApiService, NavItem } from '../../../core/services/nav-api.service';
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

  /**
   * Footer link columns, from the CMS. Falls back to no columns on error
   * rather than breaking the footer, which renders on every page.
   */
  protected linkColumns = toSignal(
    inject(NavApiService).getMenu('footer').pipe(catchError(() => of<NavItem[]>([]))),
    { initialValue: [] as NavItem[] },
  );
  protected popularSearches = FOOTER_SEARCH_LINKS;
}
