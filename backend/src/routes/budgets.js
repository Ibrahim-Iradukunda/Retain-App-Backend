import { Router } from "express";
import Budget from "../models/Budget.js";
import { requireAuth } from "../middleware/auth.js";
import { z } from "zod";

const router = Router();
const budgetSchema = z.object({
  year: z.coerce.number().int().min(2000).max(9999),
  month: z.coerce.number().int().min(1).max(12),
  amount: z.coerce.number().finite().positive().max(1_000_000_000)
});

// Both budget operations include the authenticated user ID to isolate each user's budgets.
router.get("/", requireAuth, async (req, res) => {
  const year = z.coerce.number().int().min(2000).max(9999).default(new Date().getFullYear()).parse(req.query.year);
  const budgets = await Budget.find({ user: req.user.id, year }).sort({ month: 1 }).lean();
  res.json({ budgets });
});

router.put("/", requireAuth, async (req, res) => {
  const input = budgetSchema.parse(req.body);
  // Update this user's budget for the month, or create it if it does not exist yet.
  const budget = await Budget.findOneAndUpdate(
    { user: req.user.id, year: input.year, month: input.month },
    { $set: { amount: input.amount } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );
  res.json({ budget });
});

export default router;
