---
name: website-redesigner
description: Use this skill when generating, prompting, reviewing, or improving AI website redesign concepts from website screenshots, especially full-page before/after redesigns that must preserve original content while improving visual hierarchy, typography, spacing, colour, accessibility, responsive consistency, and long-page completeness.
---

# Website Redesigner

Use this skill for screenshot-driven website redesign concepts. It is designed for SiteGlow AI and similar workflows where a public website is captured as a full-page screenshot, sent to an image model such as Cloudflare Workers AI, and compared against the original with before/after previews.

The output is a concept image unless the user explicitly asks for implementation code. The live website must not be modified.

## Operating Principles

The screenshot is the source of truth. Improve presentation, not facts.

Preserve:

- Visible text, labels, headings, prices, data, claims, disclaimers, navigation, calls to action, section order, footer content, brand identity, and meaning
- Repeated item counts when they are clear: product cards, pricing tiers, logos, testimonials, feature blocks, FAQ rows, steps, and table rows
- The page type and business intent: SaaS, ecommerce, marketplace, local service, nonprofit, editorial, portfolio, documentation, dashboard, or landing page

Do not:

- Invent new copy, products, services, prices, awards, testimonials, statistics, logos, badges, data, legal claims, or menu items
- Delete, duplicate, clip, obscure, summarize, or reorder sections in ways that change meaning
- Convert a full page into a poster, mood board, single hero, app mockup, ad, collage, or purely atmospheric image
- Distort logos, faces, products, charts, screenshots, maps, icons, form controls, or text
- Imply that the original website has been changed

If preservation and visual improvement conflict, preservation wins.

## Table Of Contents

- Quick Workflow
- Screenshot Intake
- Source Map
- Design Direction
- Prompt Templates
- Cloudflare Workers AI Guidance
- Long-Page Handling
- Hallucination Prevention
- Quality Validation
- Retry Recipes
- Failure Handling
- Final Review Checklist

## Quick Workflow

1. Inspect the screenshot from top to bottom.
2. Build a concise source map of the visible page.
3. Identify the page type, user goal, brand tone, and original conversion intent.
4. Convert user instructions into presentation direction without changing factual content.
5. Generate with a preservation-first prompt.
6. Validate against the source map.
7. Retry only with a specific failure reason and narrower instructions.
8. Deliver the concept as a redesign image, noting that the live site was not modified.

Never skip the source map for long pages, content-heavy pages, ecommerce pages, pricing pages, regulated industries, or pages with legal/financial/medical claims.

## Screenshot Intake

Before prompting, record:

- **URL and title**: source URL and detected page title, if available
- **Dimensions**: stitched image width, height, and whether the screenshot was scaled
- **Page length**: short page, medium page, or long page with many below-the-fold sections
- **Readability**: whether text is legible, partially legible, or too small/compressed
- **Known capture limits**: sticky headers, lazy-loaded content, cookie banners, modals, missing images, loading skeletons, or scroll-triggered effects

If the screenshot contains a cookie banner, modal, newsletter popup, chat widget, consent screen, or browser error page, identify it. Do not redesign the obstruction as if it were the website unless the user explicitly wants that state redesigned.

If text is unreadable, prompt the model to preserve the visible text layout and avoid inventing specific copy. Ask for a better screenshot or OCR text if exact copy fidelity matters.

## Source Map

Use this lightweight structure:

```text
Page type:
Primary goal:
Brand signals:
Visual problems:
Sections in order:
1. Header/nav:
2. Hero:
3. Section:
4. Section:
...
Footer:
Critical text/data to preserve:
Repeated item counts:
Risk notes:
```

For each section, note only what matters for fidelity:

- Heading or section purpose
- CTA labels and destination meaning
- Number of cards/items/columns
- Important facts such as prices, ratings, metrics, product names, plan names, locations, dates, policies, and disclaimers
- Key images or media subjects

Do not use the source map as replacement copy. It is a fidelity checklist and prompt aid.

## Design Direction

Translate user direction into visual treatment:

- **Premium**: calmer spacing, stronger grid, restrained palette, better photography treatment, confident type scale
- **Playful**: brighter accents, friendlier shapes, more expressive icons/illustration while preserving copy and counts
- **Editorial**: stronger typography, image-caption rhythm, clear reading flow, more elegant section pacing
- **SaaS/Fintech**: crisp hierarchy, clear CTAs, trustworthy proof, precise data/card alignment, restrained styling
- **Healthcare/Legal/Finance**: high contrast, sober trust cues, accessible forms, no invented claims or urgency
- **Ecommerce**: product clarity, price/rating prominence, useful filters, checkout confidence, no fake products
- **Local service**: location/contact clarity, service list fidelity, reviews/proof preserved, accessible booking CTAs

Reject or soften directions that would damage fidelity. Example: if the user says "make it a beach sunset", use "warm coastal colour and imagery treatment while preserving all text, sections, and meaning" rather than replacing the site content with a beach scene.

## Typography

Improve typography with a system, not random decoration:

- Preserve original readable text and labels.
- Use a coherent type scale: nav/body, section headings, hero heading, metadata, captions, legal copy.
- Keep body text legible, with comfortable line length and spacing.
- Avoid warped, tiny, decorative, pseudo-handwritten, or over-condensed text.
- Keep numbers, prices, and product names clear.
- Make long words and labels fit without clipping.
- Do not solve overflow by shrinking text into unreadability.

## Spacing And Layout

Improve structure while keeping the page recognisable:

- Align containers, grids, cards, text blocks, media, and CTAs.
- Use consistent section spacing and gutters.
- Keep repeated cards similar in size and rhythm.
- Preserve enough vertical height for long copy.
- Avoid nested decorative frames that compress content.
- Keep footer content visible and complete.
- Preserve scroll-page feeling for full-page outputs; do not compress a long page into a single poster composition.

## Colour And Imagery

Colour should support hierarchy and brand recognition:

- Keep existing brand/logo colours recognisable.
- Improve contrast for text, links, buttons, forms, and status labels.
- Use accent colour intentionally, not everywhere.
- Avoid one-note palettes where every element becomes the same hue.
- Avoid generic gradients, blurred blobs, or abstract backgrounds when real product/content clarity matters.
- Preserve image subject matter: products stay products, people stay people, charts stay charts, maps stay maps.
- If improving low-quality images, keep their role and subject equivalent.

## Accessibility

The visual concept should imply accessible implementation:

- Text contrast should visually meet WCAG AA intent.
- Buttons and links should look interactive.
- Form labels must remain visible.
- Touch targets should look large enough.
- Error/success states, required indicators, consent copy, and privacy links must remain understandable.
- Do not rely on colour alone for critical states.
- Keep reading order logical.
- Avoid placing text over busy imagery without sufficient contrast treatment.

## Responsive Consistency

Even when generating one full-page image, design as if it belongs to a responsive system:

- Use grids that could collapse cleanly on mobile.
- Keep consistent card, form, nav, and footer patterns.
- Avoid arbitrary collage placement.
- Keep line lengths and button labels realistic.
- Preserve below-the-fold content that mobile users would still need.

## Prompt Templates

### Base Redesign Prompt

Use this for first-pass generation:

```text
You are redesigning a public website screenshot into one full-page website concept image.
Use the attached screenshot as the only source of truth.

Source URL: {url}
Detected page title: {title}
Page type: {page_type}
User redesign direction: {user_direction}

Source map to preserve:
{source_map}

Critical preservation rules:
- Preserve the original visible website text wherever legible.
- Preserve section order, navigation meaning, calls to action, products/services, labels, prices, ratings, data, disclaimers, legal copy, and footer content.
- Preserve repeated item counts when visible.
- Do not invent new copy, sections, logos, testimonials, statistics, awards, products, menu items, legal claims, or pricing.
- Do not remove, duplicate, clip, hide, or reorder content in ways that change meaning.
- If text is too small or unreadable, keep a visually faithful text treatment instead of inventing specific replacement copy.

Design improvement rules:
- Improve hierarchy, typography, spacing, alignment, colour harmony, contrast, button affordance, image treatment, and responsive consistency.
- Make the result feel like the same website with better presentation.
- Keep the full page from header to footer, including below-the-fold sections.
- Avoid poster-like, collage-like, single-hero, ad-like, or app-mockup results.
- Avoid overlapping UI, warped text, cropped cards, distorted logos, broken images, and inconsistent section widths.

Return one polished full-page website redesign concept image matching the source aspect ratio as closely as possible.
```

### Cloudflare Workers AI Payload Guidance

For SiteGlow-style Cloudflare img2img generation:

```json
{
  "prompt": "{base_redesign_prompt}",
  "negative_prompt": "invented text, fake logos, missing footer, missing sections, duplicated sections, poster, collage, single hero, warped typography, overlapping text, clipped content, fake testimonials, fake statistics, distorted products, broken layout",
  "image_b64": "{before_screenshot_base64}",
  "width": "{target_width}",
  "height": "{target_height}",
  "num_steps": 12,
  "strength": 0.62,
  "guidance": 7.5
}
```

Parameter guidance:

- Lower `strength` when content fidelity is poor or text/layout changes too much.
- Slightly higher `strength` when the result is too similar and the user wants stronger visual change.
- Keep dimensions within provider limits and preserve aspect ratio as closely as practical.
- Prefer fewer steps for fast iteration, more steps only when quality improves without harming fidelity.

### Strict Fidelity Retry Prompt

Use this when content is missing, invented, duplicated, clipped, or meaning changes:

```text
Redo the redesign using the same screenshot as the only source of truth.

Previous failure:
{failure_reason}

This retry must prioritize fidelity over style:
- Preserve every visible section from header through footer.
- Keep original visible text where legible.
- Keep repeated item counts.
- Keep CTA meanings, prices, labels, legal copy, product/service claims, data, and footer content.
- Do not invent or rewrite factual content.
- Do not make a poster, collage, compressed summary, or single hero.
- Avoid clipping, overlap, warped text, duplicated sections, missing footer, and distorted logos/images.

Use cleaner hierarchy, alignment, spacing, and contrast while staying closer to the original layout.
```

### Style-Only Prompt Adapter

When user instructions are risky, adapt them:

```text
Interpret the user's style request as visual presentation only.
Do not replace the website topic, product, service, text, section order, images, or meaning.
Apply the style through colour, spacing, typography, imagery treatment, button styling, and section composition.
```

## Long-Page Handling

Long pages are the most failure-prone because models often over-focus on the hero and lose the bottom of the page.

Before generation:

- Identify all major below-the-fold sections.
- Include section names/counts in the source map.
- Explicitly mention footer preservation.
- Keep the hero from becoming disproportionately tall.
- Scale the screenshot only when necessary for provider limits, and preserve the entire page.

After generation:

- Check if the footer exists.
- Check if lower sections are missing or merged.
- Check whether repeated sections were compressed into decorative blocks.
- Check whether text becomes progressively less legible lower on the page.

If long-page fidelity repeatedly fails, recommend splitting the page into logical chunks: header/hero, mid-page content, conversion/pricing, footer.

## Hallucination Prevention

Before prompting:

- State that the screenshot is the only source of truth.
- Include a source map.
- Ban invented copy, claims, prices, stats, awards, logos, testimonials, sections, and products.
- Require original section order and repeated item counts.
- Tell the model how to handle unreadable text.

After generation, compare against the source map:

- Is every mapped section present?
- Are item counts still correct?
- Are CTAs semantically equivalent?
- Did new claims, numbers, testimonials, or logos appear?
- Did the model replace product imagery or chart meaning?
- Is legible source text still legible and plausible?

## Quality Validation

Score the output before accepting it:

```text
Content fidelity: 0-5
Section completeness: 0-5
Text legibility: 0-5
Visual hierarchy: 0-5
Accessibility/contrast: 0-5
Brand continuity: 0-5
Long-page completeness: 0-5
```

Accept only if:

- Content fidelity is at least 4.
- Section completeness is at least 4.
- No critical factual content is invented.
- Footer and below-the-fold sections are present when visible in the source.
- The result reads as a full webpage, not an illustration or poster.

Reject if:

- Any critical section is missing.
- New factual claims, prices, products, testimonials, or stats appear.
- Footer is clipped or absent on a long page.
- Text is unreadable where the source was readable.
- Logos/products/charts are distorted enough to change meaning.

## Retry Recipes

Use one retry reason at a time:

- **Missing footer**: "The footer and final sections were omitted. Preserve all bottom sections and reduce hero height."
- **Invented copy**: "The result added new marketing text. Preserve source text and use visually similar blocks for unreadable copy."
- **Duplicated cards**: "Repeated items were duplicated. Keep the same count and order as the screenshot."
- **Poster result**: "The output became a poster. Redo as a scrollable full-page website layout."
- **Warped text**: "Text became distorted. Use cleaner typography and simpler layout while preserving labels."
- **Clipped cards**: "Cards were clipped. Increase spacing and preserve full card boundaries."
- **Wrong imagery**: "Images changed subject. Preserve the original image subjects and only improve treatment."
- **Too similar**: "The result is too close to the source. Improve spacing, hierarchy, typography, colour, and button affordance without changing content."

After two failed retries, reduce ambition. Ask for a cleaner faithful redesign rather than a dramatic transformation.

## Failure Handling

Capture failures:

- Explain whether the issue is invalid URL, private/local URL, browser permission, restricted Chrome page, timeout, scripting denial, or dynamic loading.
- Suggest retrying a public HTTP/HTTPS URL.
- Do not say the website was changed.

Cloudflare authentication failures:

- Ask the user to verify Account ID and Workers AI API token.
- Do not display, log, or repeat the token.
- Let the user replace or delete the token.

Quota/rate-limit failures:

- Say Cloudflare Workers AI daily allocation or rate limit was reached.
- Suggest waiting, checking Workers AI usage, or trying a lighter model if available.

Model failures:

- Report the selected model name.
- Ask the user to choose a Cloudflare Workers AI image model that supports the requested generation mode.
- Do not silently switch models.

Output failures:

- Explain the concrete issue: missing content, invented content, clipping, overlap, unreadable text, poster-like result, or distorted imagery.
- Retry with the matching retry recipe.
- If repeated failures occur on a very long page, recommend chunking the page.

## Final Review Checklist

Before delivering or accepting a redesign concept:

- Header and navigation labels preserved
- Hero offer and CTA meaning preserved
- All visible sections present in original order
- Repeated item counts match the source where clear
- Prices, ratings, data, labels, legal copy, and disclaimers preserved
- Footer complete and not clipped
- No invented products, services, logos, awards, testimonials, stats, prices, or legal claims
- No duplicated sections or missing below-the-fold content
- Text legible where the source was legible
- Images, logos, charts, and product visuals retain meaning
- Layout has clearer hierarchy, alignment, spacing, and contrast
- Design remains recognisable as the same website
- Result looks like a full-page website, not a poster or collage
- The live website was not modified
