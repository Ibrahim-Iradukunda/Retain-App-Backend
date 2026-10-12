import { Router } from "express";
import Category from "../models/Category.js";
import Expense from "../models/Expense.js";
import User from "../models/User.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth, requireAdmin);

export function getUtcMonthRange(date = new Date()) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
  return { start, end };
}

export function getCurrentMonthExpenseFilter(date = new Date()) {
  const { start, end } = getUtcMonthRange(date);
  return { createdAt: { $gte: start, $lt: end } };
}

export function getCategoryRankings(categoryStats) {
  const byMostUsed = (left, right) => right.count - left.count || left.category.localeCompare(right.category);
  const byLeastUsed = (left, right) => left.count - right.count || left.category.localeCompare(right.category);

  return {
    topCategories: [...categoryStats].sort(byMostUsed).slice(0, 5),
    bottomCategories: [...categoryStats].sort(byLeastUsed).slice(0, 5)
  };
}

router.get("/insights", async (req, res) => {
  const [registeredUsers, expenseStats, categoryStats, currentMonthExpenseCount, recentUsers, recentExpenses] = await Promise.all([
    User.countDocuments(),
    Expense.aggregate([{ $group: { _id: null, count: { $sum: 1 }, total: { $sum: "$amount" } } }]),
    Category.aggregate([
      {
        $lookup: {
          from: Expense.collection.name,
          let: { categoryId: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$category", "$$categoryId"] } } },
            { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }
          ],
          as: "expenseStats"
        }
      },
      {
        $project: {
          _id: 0,
          category: "$name",
          color: "$color",
          total: { $ifNull: [{ $arrayElemAt: ["$expenseStats.total", 0] }, 0] },
          count: { $ifNull: [{ $arrayElemAt: ["$expenseStats.count", 0] }, 0] }
        }
      }
    ]),
    Expense.countDocuments(getCurrentMonthExpenseFilter()),
    User.find().select("name email createdAt").sort({ createdAt: -1 }).limit(5).lean(),
    Expense.find().populate("user", "name email").populate("category", "name").sort({ createdAt: -1 }).limit(5).lean()
  ]);
  categoryStats.sort((left, right) => right.total - left.total || left.category.localeCompare(right.category));
  const { topCategories, bottomCategories } = getCategoryRankings(categoryStats);

  res.json({
    registeredUsers,
    expenseCount: expenseStats[0]?.count ?? 0,
    totalSpending: expenseStats[0]?.total ?? 0,
    currentMonthExpenseCount,
    categoryStats,
    topCategories,
    bottomCategories,
    recentUsers,
    recentExpenses
  });
});

export default router;
