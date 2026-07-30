export function buildRedesignPrompt(options: {
  url: string;
  pageTitle?: string;
  instructions?: string;
}): string {
  const userInstructions = options.instructions?.trim()
    ? `User redesign direction: ${options.instructions.trim()}`
    : 'User redesign direction: Improve the page into a polished, modern, trustworthy web design while preserving its original content and intent.';

  return [
    'You are redesigning a public website screenshot into a single full-page concept image.',
    'Use the provided screenshot as the source of truth.',
    `Source URL: ${options.url}`,
    options.pageTitle ? `Detected page title: ${options.pageTitle}` : '',
    userInstructions,
    '',
    'Critical preservation rules:',
    '- Preserve the original website text, section order, information hierarchy, navigation meaning, calls to action, product/service claims, labels, prices, data, disclaimers, and footer content.',
    '- Do not invent new copy, brands, products, testimonials, statistics, legal claims, menu items, or sections.',
    '- Do not delete, duplicate, clip, obscure, or rearrange content in ways that change meaning.',
    '- Keep the output as a full-page website redesign, not a poster, mood board, isolated hero, ad, collage, wireframe, or app mockup.',
    '',
    'Design improvement rules:',
    '- Improve visual hierarchy, spacing, alignment, typography, color harmony, contrast, button affordance, image treatment, and responsive consistency.',
    '- Keep text legible and avoid warped text, overlapping UI, cropped cards, distorted logos, broken images, and inconsistent section widths.',
    '- Preserve the long-page structure from top to bottom, including below-the-fold sections.',
    '- Make the redesign feel like the same website with better presentation.',
    '',
    'Return one polished full-page website redesign concept image matching the source page aspect as closely as possible.'
  ].filter(Boolean).join('\n');
}
