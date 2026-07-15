---
name: creative-coding-reference
description: Curated creative-coding reference adapted from terkelg/awesome-creative-coding (CC0). Not a rules skill — a technique + resource map for generative art, shaders, canvas animation, data visualization, and interaction design. Consult when a design calls for generative/algorithmic visuals or advanced motion.
source: https://github.com/terkelg/awesome-creative-coding
---

# Creative Coding Reference (distilled)

## When to reach for this
Generative backgrounds/textures, particle systems, flow fields, noise-driven organic motion, kinetic typography, audio-reactive visuals, data-art, shader effects, plotter-style line art. Creative coding aims for something *expressive*, not just functional.

## Technique vocabulary (browser-native, no build step)
- **Noise**: Perlin/simplex noise for organic motion — drive position, rotation, color through time-varying noise instead of raw random. Flow fields: sample a noise-based vector field, advect particles along it.
- **Physics-ish motion**: springs (`v += (target-x)*k; v *= damping`), easing (easings.net curves), verlet particles, attraction/repulsion.
- **L-systems & recursion**: branching plants, fractal structure.
- **Signed distance functions (SDF)**: raymarched shapes in fragment shaders; smooth-min unions for blobby forms (Íñigo Quílez's articles are the canon).
- **Shepherded randomness**: constrain random walks so results stay composed (inconvergent.net essays).
- **Marching / trigonometric patterns**: Lissajous, phyllotaxis (golden-angle spirals), harmonographs, cycloids.
- **Dithering & pixel aesthetics**: ordered/Floyd-Steinberg for retro texture.

## Library map (CDN-loadable, relevant here)
- **2D canvas**: p5.js (Processing idiom), Two.js, Pts.js, Paper.js (vector), Fabric.js. Zdog for pseudo-3D.
- **WebGL/3D**: three.js (default), OGL/picogl (minimal), Babylon (games), regl (functional).
- **Motion/animation**: Theatre.js (timeline), GSAP-family scrolltelling only when motivated.
- **Patterns via CSS**: css-doodle web component.
- **Physics**: Oimo.js / Ammo.js (3D), simple verlet hand-rolled for 2D.
- **ML-flavored**: ml5.js, TensorFlow.js (pose/hand detection driving visuals).

## Learning canon (point users here when asked)
The Nature of Code (Shiffman) · The Book of Shaders · WebGL/WebGL2 Fundamentals · Generative Design (generative-gestaltung.de) · A Primer on Bézier Curves (Pomax) · iquilezles.org (SDF/raymarching) · Tyler Hobbs' essays (composition & color in generative art) · Coding Train videos · tixy.land (minimal playground) · Shadertoy (shader gallery) · OpenProcessing (sketch gallery) · Dwitter (140-char demos).

## Practice rules when applying here
- Prefer `<canvas>` 2D or CSS-only motion for HTML artifacts; three.js from CDN when 3D is truly warranted.
- Drive continuous animation with requestAnimationFrame + time delta; never setInterval.
- Seed randomness so a composition is reproducible; expose the seed as a tweak.
- Respect prefers-reduced-motion: pause loops or render a still frame.
- Generative art still needs composition: value contrast, focal point, negative space (Hobbs' tips apply).
- In this environment, an all-canvas piece may be a plain .html file; anything with DOM layout stays a Design Component.
