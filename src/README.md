# The core layer

Everything that crosses a page boundary in Design Diffusion lives here. The
three pages keep their own DOM, motion and visual code and reach this through
one global, `DD`, loaded from `dist/dd.js` as a classic script.

    start.html  ──lit words──▶  pocket  ──▶  library.html
                                  │
                                  └──seed link──▶  mvp_v6.html

## Why it exists

The pages used to invent their own shapes. `start.html` wrote a pocket of
`{ref, items}`. `library.html` read `p.words`, found nothing, failed its own
guard, and rendered demo data instead. It looked like it worked. Nothing a user
ever lit reached the library. `mvp_v6.html` was linked with `?seed=<word>` and
never read the query string at all.

There was no type between them, so nothing could complain. Now there is one.

## The files

| file | what it owns |
|---|---|
| `model.ts` | the types. `Category`, `Tone`, `LitWord`, `Pocket`. Change a shape here and every page fails to compile, which is the point. |
| `classify.ts` | a word becomes an element. The backstage translation the canvas needs so it can drop category containers from the UI. |
| `pocket.ts` | read, write, and migrate the pocket. Reads both the old shape and the new one. |
| `seed.ts` | the `?seed=` codec. Carries the whole pocket in the URL. |
| `grow.ts` | the association engine. Canned today, LLM tomorrow, same interface. |
| `storage.ts` | localStorage that degrades to memory instead of throwing. |

## Two decisions worth keeping

**The link carries the words, storage is only an optimisation.** localStorage
throws in a sandboxed iframe, which is where artifacts run. So `?seed=` holds a
base64url pocket (a three-word pocket is about 190 characters) and the canvas
opens correctly with storage completely blocked. Side effect: a canvas link is
now shareable, which is the workflow-sharing Library wanted anyway.

**The classifier proposes and can be overruled.** `classify()` returns `why`,
the signal it matched, so a reading can be shown and argued with rather than
imposed. A word the user typed themselves is never classified at all: it goes
to *My Ideas* as-is, because it is already theirs.

## Swapping the canned engine for a real LLM

One line, at page boot, before anything grows:

```js
DD.setGrowEngine(DD.llmEngine({ endpoint: "/api/grow" }));
```

Your endpoint receives `{term, context, prompt}` and returns `{"words": [...]}`.
`DD.proposePrompt()` is the brief the model is held to; it is written to stop the
model being tasteful and decisive when its job is to be generative and
uncommitted. If the call fails or times out it falls back to canned, because a
demo that dies without an API key is not a demo.

Fabric is deliberately not a sixth category yet. Material words land in
*Pattern & Texture*. Promoting it means one key in `CATS`, one signal block in
`classify.ts`, and one `READINGS` axis in the canvas. Nothing else.

## Commands

    npm run build       # src/ -> dist/dd.js  (commit the output)
    npm run check       # typecheck
    npm run check:core  # classifier, migration, seed round-trip
    npm run e2e         # drive all three pages in a real browser
