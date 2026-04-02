import { forwardRef } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/vibez/ui/accordion';

const faqs = [
  { question: 'Is my exact location shared with other users?', answer: 'No, your exact address or unit number is never shared. Other users only see that you live in the same estate or neighborhood. Your privacy is our top priority.' },
  { question: 'How does neighbor verification work?', answer: 'We verify neighbors through estate confirmation during registration. You select your estate from our verified list, and in some cases, we may request additional verification to ensure community safety.' },
  { question: 'What if someone is inappropriate during a chat?', answer: 'You can instantly report any user with our one-tap report button. We have a three-strike policy, and reported users are reviewed within 24 hours. Serious violations result in immediate removal.' },
  { question: 'Is Where really free?', answer: 'Yes! Where is 100% free for all residents. We believe community building should be accessible to everyone. Premium features may be introduced later, but the core experience will always be free.' },
  { question: 'Can I use Where without video?', answer: 'Absolutely! You can enable text-only mode in your profile settings. Many users prefer starting with text chats before moving to video. The choice is always yours.' },
  { question: 'Which estates are currently supported?', answer: "We're currently live in select Nairobi estates including Kilimani, Westlands, Lavington, and more. We're rapidly expanding to new areas. Check during registration to see if your estate is available!" },
];

const FAQ = forwardRef<HTMLElement, Record<string, never>>((_, ref) => {
  return (
    <section ref={ref} className="py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14">
          <h2 className="text-4xl font-bold text-foreground mb-4">Frequently Asked Questions</h2>
          <p className="text-lg text-muted-foreground">Everything you need to know about Where</p>
        </div>

        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="glass rounded-xl px-6 data-[state=open]:border-where-coral/20 transition-all overflow-hidden"
              >
                <AccordionTrigger className="text-left font-semibold text-foreground hover:text-where-coral hover:no-underline py-5">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-5 leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
});

FAQ.displayName = 'FAQ';

export default FAQ;
