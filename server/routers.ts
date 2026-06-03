import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as matching from "./matching";

const campusUserSchema = z.object({
  id: z.string().min(1),
  nickname: z.string().min(1),
  avatar: z.string().min(1),
  rankTier: z.string().min(1),
  score: z.number().int().nonnegative(),
});

const locationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  matching: router({
    enterLobby: publicProcedure
      .input(z.object({
        user: campusUserSchema,
        location: locationSchema,
      }))
      .mutation(({ input }) => matching.enterLobby(input)),

    listLobby: publicProcedure
      .input(z.object({ campusId: z.string().min(1) }))
      .query(({ input }) => matching.listLobbyUsers(input)),

    createBroadcast: publicProcedure
      .input(z.object({
        userId: z.string().min(1),
        message: z.string().min(1).max(200),
        preferredTime: z.string().max(80).optional(),
        preferredVenue: z.string().max(80).optional(),
      }))
      .mutation(({ input }) => matching.createBroadcast(input)),

    listBroadcasts: publicProcedure
      .input(z.object({
        campusId: z.string().min(1),
        viewerLocation: locationSchema.optional(),
      }))
      .query(({ input }) => matching.listBroadcasts(input)),

    cancelBroadcast: publicProcedure
      .input(z.object({ userId: z.string().min(1) }))
      .mutation(({ input }) => matching.cancelBroadcast(input)),

    refreshPresence: publicProcedure
      .input(z.object({
        userId: z.string().min(1),
        location: locationSchema,
      }))
      .mutation(({ input }) => matching.refreshPresence(input)),
  }),

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
