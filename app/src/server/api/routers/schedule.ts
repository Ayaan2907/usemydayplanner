import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";

const blockSchema = z.object({
  blockId: z.string(),
  start: z.string(),
  end: z.string(),
  title: z.string(),
  note: z.string().optional().default(""),
  location: z.string(),
  priority: z.string(),
  type: z.string(),
});

export const scheduleRouter = createTRPCRouter({
  getByDate: publicProcedure
    .input(z.object({ date: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.schedule.findUnique({
        where: { date: input.date },
        include: { blocks: { orderBy: { sortOrder: "asc" } } },
      });
    }),

  // Range query for week/month views — returns all schedules within a date range
  getByRange: publicProcedure
    .input(z.object({ start: z.string(), end: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.schedule.findMany({
        where: { date: { gte: input.start, lte: input.end } },
        include: { blocks: { orderBy: { sortOrder: "asc" } } },
        orderBy: { date: "asc" },
      });
    }),

  upsert: publicProcedure
    .input(z.object({
      date: z.string(),
      title: z.string().optional().default(""),
      note: z.string().optional().default(""),
      blocks: z.array(blockSchema),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.schedule.findUnique({ where: { date: input.date } });

      if (existing) {
        await ctx.db.block.deleteMany({ where: { scheduleId: existing.id } });
        return ctx.db.schedule.update({
          where: { id: existing.id },
          data: {
            title: input.title,
            note: input.note,
            blocks: {
              create: input.blocks.map((b, i) => ({ ...b, sortOrder: i })),
            },
          },
          include: { blocks: { orderBy: { sortOrder: "asc" } } },
        });
      }

      return ctx.db.schedule.create({
        data: {
          date: input.date,
          title: input.title,
          note: input.note,
          blocks: {
            create: input.blocks.map((b, i) => ({ ...b, sortOrder: i })),
          },
        },
        include: { blocks: { orderBy: { sortOrder: "asc" } } },
      });
    }),

  toggleBlock: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const block = await ctx.db.block.findUniqueOrThrow({ where: { id: input.id } });
      const updated = await ctx.db.block.update({
        where: { id: input.id },
        data: { completed: !block.completed },
      });

      await ctx.db.patternLog.create({
        data: {
          date: new Date().toISOString().split("T")[0]!,
          blockType: block.type,
          action: updated.completed ? "completed" : "uncompleted",
          context: block.title,
        },
      });

      return updated;
    }),

  updateBlock: publicProcedure
    .input(z.object({
      id: z.string(),
      title: z.string().optional(),
      note: z.string().optional(),
      start: z.string().optional(),
      end: z.string().optional(),
      location: z.string().optional(),
      priority: z.string().optional(),
      type: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.block.update({ where: { id }, data });
    }),

  deleteBlock: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const block = await ctx.db.block.findUniqueOrThrow({ where: { id: input.id } });
      await ctx.db.patternLog.create({
        data: {
          date: new Date().toISOString().split("T")[0]!,
          blockType: block.type,
          action: "removed",
          context: block.title,
        },
      });
      return ctx.db.block.delete({ where: { id: input.id } });
    }),

  reorderBlocks: publicProcedure
    .input(z.object({
      scheduleId: z.string(),
      blockIds: z.array(z.string()),
    }))
    .mutation(async ({ ctx, input }) => {
      await Promise.all(
        input.blockIds.map((id, i) =>
          ctx.db.block.update({ where: { id }, data: { sortOrder: i } })
        )
      );
      return { success: true };
    }),

  updateMeta: publicProcedure
    .input(z.object({
      date: z.string(),
      title: z.string().optional(),
      note: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { date, ...data } = input;
      return ctx.db.schedule.upsert({
        where: { date },
        update: data,
        create: { date, ...data },
      });
    }),
});
