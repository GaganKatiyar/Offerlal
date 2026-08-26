import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AccordionItem } from '../../../shared/ui/accordion/accordion-item';

interface FaqEntry {
  question: string;
  answer: string;
}

const FAQS: FaqEntry[] = [
  { question: 'How do I choose the right size?', answer: 'Refer to the Size Guide on every product page for bust, waist, hip and shoulder measurements. If you are between sizes, we recommend sizing up or requesting a custom fitting.' },
  { question: 'Can I get a garment customized to my measurements?', answer: 'Yes. Most lehengas, sarees and gowns offer blouse stitching, fall & pico and custom-size options at checkout. You can also save your measurements under Account > Size Profile.' },
  { question: 'How long does delivery take?', answer: 'In-stock items ship in 4-7 days. Made-to-order and bridal pieces typically take 10-18 days depending on the level of embroidery. Express delivery is available at checkout.' },
  { question: 'What is your exchange and return policy?', answer: 'We offer a 7-day exchange window on unstitched and non-customized pieces. Customized and made-to-order items are final sale unless the product arrives defective.' },
  { question: 'Do you offer Cash on Delivery?', answer: 'COD is available on eligible orders and pin codes, selectable at checkout alongside UPI, cards, net banking and wallets.' },
  { question: 'How do I track my order?', answer: 'Use the Track Your Order page with your order number, or view live status under Account > My Orders.' },
  { question: 'How is my data used?', answer: 'We use your information only to process orders, provide customer support and, with consent, send updates about new collections. We never sell your data to third parties.' },
  { question: 'What are your terms of service?', answer: 'By placing an order, you agree to our standard sale terms: prices are in INR inclusive of taxes, and made-to-order items may vary slightly from photos due to handcrafted embroidery.' },
];

@Component({
  selector: 'app-faq',
  standalone: true,
  imports: [AccordionItem],
  templateUrl: './faq.html',
  styleUrl: './faq.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Faq {
  protected faqs = FAQS;
}
