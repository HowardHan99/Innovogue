/* =============== the palette, once =============== */

/* Single source for every colour that appears in more than one place.
   tokens.css is GENERATED from this file (npm run tokens); model.ts reads the
   category hexes from here. Before this file each page carried its own :root
   and the four pages had four slightly different inks, two pinks and two
   backgrounds — not as a design decision, just as drift.

   The values are Library's sign-off (the rose/zoned direction) plus the moss
   canvas: saturation is inversely proportional to area, so the hot pink only
   exists at button scale, large surfaces stay at tint level, and the canvas
   sits cool against warm panels so the work area reads as a different
   temperature than the chrome around it. */

export const PALETTE = {
  /* surfaces — warm plum-dark family, from library.html */
  bg: "#141114",
  card: "#1D191C",
  panel: "#272127",

  /* the moss canvas. The one cool surface in the app: the board the work
     happens on is colder than every panel around it, which is what makes a
     warm gown card read as figure against ground. */
  canvas: "#182019",
  canvasLine: "rgba(196, 214, 181, .10)",

  /* ink */
  ink: "#F6F2E8",
  inkSoft: "#ADA79A",
  inkDim: "#7E7A6F",

  /* hairlines */
  line: "rgba(255,255,255,.11)",
  lineSoft: "rgba(255,255,255,.06)",

  /* two-register pink. `pink` is the workhorse rose — chips, hovers, borders.
     `pinkHot` is reserved for button-sized elements only; if it is being
     painted on anything larger than a CTA, that is a violation, not a theme. */
  pink: "#F493BE",
  pinkHot: "#FF8FC2",
  pinkInk: "#2E1220",

  /* companions */
  butter: "#EDE4A2",
  green: "#A9C77F",
  blue: "#7FB4E6",

  radius: "14px",
} as const;

/* The five element categories. Hot pink is legal here because a category
   swatch is a dot or a chip — button-scale by definition. */
export const CAT_HEX = {
  Pattern: "#FF8FC2",
  Silhouette: "#EDE4A2",
  Color: "#A9C77F",
  Symbolic: "#7FB4E6",
  Custom: "#8b877c",
} as const;

/** The generated stylesheet. Aliases at the bottom keep older pages'
    variable names alive so a page can migrate without a rename sweep. */
export function tokensCss(): string {
  const p = PALETTE;
  return `/* GENERATED from src/tokens.ts — edit that file, then \`npm run tokens\`. */
:root{
  /* surfaces */
  --bg:${p.bg};
  --card:${p.card};
  --panel:${p.panel};
  --canvas:${p.canvas};
  --canvas-line:${p.canvasLine};

  /* ink */
  --ink:${p.ink};
  --ink-soft:${p.inkSoft};
  --ink-dim:${p.inkDim};

  /* hairlines */
  --line:${p.line};
  --line-soft:${p.lineSoft};

  /* accents — pink comes in two registers: --pink is the workhorse rose,
     --pink-hot is button-sized elements ONLY */
  --pink:${p.pink};
  --pink-hot:${p.pinkHot};
  --pink-ink:${p.pinkInk};
  --butter:${p.butter};
  --green:${p.green};
  --blue:${p.blue};

  /* element categories */
  --pat:${CAT_HEX.Pattern};
  --sil:${CAT_HEX.Silhouette};
  --col:${CAT_HEX.Color};
  --sym:${CAT_HEX.Symbolic};
  --cus:${CAT_HEX.Custom};

  /* geometry */
  --radius:${p.radius};

  /* legacy aliases (innovogue-v23.html) */
  --fg:var(--ink);
  --dim:var(--ink-soft);
  --dim2:var(--ink-dim);
}
`;
}
