import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";

export const patternsRouter = createTRPCRouter({
  getInsights: publicProcedure.query(async ({ ctx }) => {
    const logs = await ctx.db.patternLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    const byType: Record<string, { completed: number; total: number }> = {};
    for (const log of logs) {
      if (!byType[log.blockType]) byType[log.blockType] = { completed: 0, total: 0 };
      byType[log.blockType]!.total++;
      if (log.action === "completed") byType[log.blockType]!.completed++;
    }

    const insights = Object.entries(byType).map(([type, stats]) => ({
      type,
      completionRate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
      total: stats.total,
    }));

    return insights.sort((a, b) => b.total - a.total);
  }),

  getHistory: publicProcedure
    .input(z.object({ days: z.number().default(7) }))
    .query(async ({ ctx, input }) => {
      const since = new Date();
      since.setDate(since.getDate() - input.days);
      const sinceStr = since.toISOString().split("T")[0]!;

      return ctx.db.schedule.findMany({
        where: { date: { gte: sinceStr } },
        include: { blocks: true },
        orderBy: { date: "desc" },
      });
    }),
});
