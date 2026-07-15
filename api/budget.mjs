/* GET /api/budget — how much of the $50 is gone. Read-only, safe to expose:
   it is a number, and seeing it is how the owner knows where the cap stands. */
import { budget } from "./_budget.mjs";

export default async function handler(req, res) {
  res.status(200).json(await budget());
}
