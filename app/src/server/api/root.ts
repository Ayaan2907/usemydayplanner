import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { scheduleRouter } from "./routers/schedule";
import { prayerRouter } from "./routers/prayer";
import { patternsRouter } from "./routers/patterns";

export const appRouter = createTRPCRouter({
  schedule: scheduleRouter,
  prayer: prayerRouter,
  patterns: patternsRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
