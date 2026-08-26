import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ImageWithFallback } from '../../../shared/components/image-with-fallback/image-with-fallback';
import { pexelsImage } from '../../../core/demo-data/image-catalog.data';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [ImageWithFallback],
  templateUrl: './about.html',
  styleUrl: './about.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class About {
  protected heroImage = pexelsImage(35586107, 1400);
}
