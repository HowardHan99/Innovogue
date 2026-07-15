---
name: ui-ux-pro-max
description: Design intelligence for professional UI/UX. Adapted from nextlevelbuilder/ui-ux-pro-max-skill v2 (MIT). The original ships a Python BM25 search engine over CSV databases (67 styles, 161 palettes, 57 font pairings, 161 reasoning rules); this environment has no shell, so this file distills the reasoning methodology to apply directly.
source: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
---

# UI UX Pro Max (distilled)

## Core workflow: generate a design system BEFORE coding
For every UI/UX request (build / design / create / review / fix / improve), first produce a compact design-system block, then implement against it:

1. **PATTERN** — page structure + conversion strategy + section list (e.g. Hero-Centric + Social Proof: Hero → Services → Testimonials → Booking → Contact; CTA above fold, repeated after testimonials).
2. **STYLE** — pick ONE named UI style matched to product type (see style catalog below), with keywords, best-for, performance and accessibility notes.
3. **COLORS** — 5 roles: Primary / Secondary / CTA / Background / Text, with hex and a one-line rationale. Industry-appropriate mood.
4. **TYPOGRAPHY** — display + body pairing (Google Fonts), mood description, matched to industry.
5. **KEY EFFECTS** — 2-3 named interactions (e.g. soft shadows + 200-300ms transitions + gentle hover states).
6. **ANTI-PATTERNS** — what NOT to do for this industry (e.g. banking: no AI purple/pink gradients; spa: no harsh animations, no neon).
7. **PRE-DELIVERY CHECKLIST** — run before shipping:
   - No emojis as icons (use SVG icon sets: Heroicons/Lucide/Phosphor)
   - cursor-pointer on all clickable elements
   - Hover states with smooth transitions (150-300ms)
   - Text contrast ≥4.5:1 (light and dark)
   - Focus states visible for keyboard nav
   - prefers-reduced-motion respected
   - Responsive checked at 375 / 768 / 1024 / 1440

## Style catalog (match product → style)
Minimalism & Swiss (enterprise, dashboards, docs) · Neumorphism (wellness, meditation) · Glassmorphism (modern SaaS, fintech dashboards) · Brutalism / Neubrutalism (portfolios, Gen-Z brands) · Dark Mode OLED (dev tools, night apps) · Claymorphism (education, kids) · Aurora / Gradient Mesh (creative SaaS heroes) · Retro-Futurism / Y2K / Vaporwave (music, gaming, fashion) · Flat (MVPs, mobile) · Liquid Glass (premium SaaS, high-end e-com) · Motion-Driven (portfolio, storytelling) · Soft UI Evolution (modern enterprise, spa/wellness) · Bento Grid (feature pages, dashboards, personal sites) · Cyberpunk / HUD FUI (gaming, crypto, security) · Organic Biophilic / Nature Distilled (sustainability, wellness) · AI-Native (chatbots, copilots) · Memphis (creative agencies, youth) · Dimensional Layering (card UIs, modals) · Exaggerated Minimalism (fashion, architecture) · Kinetic Typography (heroes, marketing) · Parallax Storytelling (launches, brand stories) · Swiss Modernism 2.0 (corporate, editorial) · Pixel Art (indie games, retro) · Spatial UI (VR/AR) · E-Ink / Paper (reading apps) · Editorial Grid / Magazine (news, blogs) · Chromatic Aberration (music, gaming) · Vintage Analog / Retro Film (photography, vinyl) · Interactive Cursor (creative portfolios) · 3D Product Preview (e-commerce)

Landing-page patterns: Hero-Centric · Conversion-Optimized · Feature-Rich Showcase · Minimal & Direct · Social Proof-Focused · Interactive Product Demo · Trust & Authority · Storytelling-Driven.

Dashboard patterns: Data-Dense · Executive Summary · Real-Time Monitoring · Drill-Down · Comparative · Predictive · Behavior Analytics · Financial · Sales Intelligence.

## Reasoning rules (by industry)
Match the product type first, then filter style/colors/type through the industry lens:
- **Tech/SaaS/AI**: modern styles (glass, bento, AI-native), high-contrast neutrals + one accent, geometric sans.
- **Finance/banking**: trust first — restrained palettes, no AI purple/pink gradients, strong hierarchy, WCAG AA+.
- **Healthcare**: calm, accessible, generous type sizes, clear forms, no dark-mode default.
- **Luxury/e-commerce**: refined serif or exaggerated minimalism, large imagery, muted palettes + one metallic accent.
- **Wellness/beauty**: Soft UI Evolution / organic, soft shadows, calming palettes, gentle motion.
- **Creative/portfolio/agency**: bolder — brutalism, motion-driven, kinetic type, interactive cursor.
- **Government/public**: accessible & ethical style, uswds/govuk mindset, boring is good.
- **Gaming/entertainment**: cyberpunk, retro-futurism, 3D, high energy.

## Persistence (Master + Overrides)
For multi-page projects, persist the generated design system: a MASTER definition (colors, typography, spacing, components) plus per-page override notes that record only deviations. When building a page, check its override first; otherwise the master rules apply exclusively. In this environment, keep the master in the project (e.g. `design-system/MASTER.md`) or carry it forward in conversation.

## Note on this adaptation
The upstream repo's `search.py` (BM25 over CSVs) and `uipro` CLI require a shell + Python and are not runnable here. The databases' content categories are represented above; apply them by reasoning rather than retrieval. In this project, brand-locked work (Innovogue/Design Diffusion) keeps its existing palette and type — use this skill's checklists and industry reasoning, not its palette generator, for that work.
