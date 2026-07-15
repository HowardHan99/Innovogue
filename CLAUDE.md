# Project instructions

## Installed skill: Taste Skill (anti-slop frontend)
The `design-taste-frontend` skill from https://github.com/Leonxlnx/taste-skill (v2, MIT) is installed at `skills/taste-skill/SKILL.md`. Read it and apply it to all frontend/UI design work in this project (landing pages, portfolios, redesigns).

Core rules to keep front of mind:
- Read the brief first and state a one-line Design Read before building.
- Three dials — DESIGN_VARIANCE, MOTION_INTENSITY, VISUAL_DENSITY (baseline 8/6/4); adjust conversationally per brief.
- Hard bans: em-dashes anywhere visible; AI-purple gradients; Inter/Fraunces/Instrument_Serif as default; three-equal feature cards; div-based fake screenshots; hand-rolled decorative/icon SVG; section-number eyebrows; scroll cues; generic Jane Doe / Acme names; fake-perfect numbers.
- Locks: one theme, one accent color, one corner-radius scale per page.
- Motion must be motivated and must honor prefers-reduced-motion; never `window.addEventListener('scroll')`.
- Run the Section-14 pre-flight check before delivering.

## Installed skill: Huashu Design (HTML-native design)
The `huashu-design` skill from https://github.com/alchaincyf/huashu-design (v2, MIT) is installed at `skills/huashu-design/SKILL.md`. Read it and apply it to hi-fi prototypes, decks, animations, infographics, and design-variation work in this project.

Core rules to keep front of mind:
- Fact-check before assumption: verify specific products/versions/specs with web_search before asserting; never assert from memory.
- Grow from existing context, never a blank page; if the brief is vague, enter Design-Direction Advisor mode (3 differentiated directions from 3 different schools).
- Core Asset Protocol when a specific brand is involved: logo required, product image for physical products, UI screenshots for digital; never CSS-silhouette a real product; solidify into `brand-spec.md`.
- Junior-Designer mode: show assumptions/placeholders early, iterate; give 3+ variations, not one final answer.
- Placeholder over bad implementation; system first, no filler; anti-AI-slop always on.
- Adapt its Claude-Code mechanics (CLI scripts, Playwright, external jsx) to this environment's Design Component (.dc.html) + starter-component workflow.

## Installed skill: UI UX Pro Max (design intelligence)
The `ui-ux-pro-max` skill from https://github.com/nextlevelbuilder/ui-ux-pro-max-skill (v2, MIT) is distilled at `skills/ui-ux-pro-max/SKILL.md`. Read it for any UI/UX build, review, or redesign.

Core rules to keep front of mind:
- Before coding, produce a compact design-system block: PATTERN → STYLE → COLORS (Primary/Secondary/CTA/Background/Text) → TYPOGRAPHY → KEY EFFECTS → ANTI-PATTERNS → PRE-DELIVERY CHECKLIST.
- Match the product's industry to a named style + palette mood; apply the industry's anti-patterns (e.g. banking: no AI purple/pink gradients).
- Pre-delivery checklist: no emoji-as-icons, cursor-pointer on clickables, 150-300ms hover transitions, contrast ≥4.5:1, visible focus states, prefers-reduced-motion, responsive at 375/768/1024/1440.
- For brand-locked work (Innovogue/Design Diffusion) keep the existing palette + type; use the checklists and industry reasoning, not the palette generator.
- The upstream Python search CLI is not runnable here — apply the methodology by reasoning, not retrieval.

## Installed skill: Creative Coding Reference (generative/motion)
The `creative-coding-reference` skill from https://github.com/terkelg/awesome-creative-coding (CC0) is distilled at `skills/creative-coding/SKILL.md`. Consult it when a design calls for generative art, shaders, particle/flow-field motion, data-art, or advanced animation — it's a technique + library + resource map, not a rules skill.

Core rules to keep front of mind:
- Prefer canvas 2D or CSS motion for HTML artifacts; three.js from CDN only when 3D is truly warranted.
- Drive motion with requestAnimationFrame + time delta (never setInterval); seed randomness and expose the seed; honor prefers-reduced-motion.
- Generative visuals still need composition: value contrast, focal point, negative space.
