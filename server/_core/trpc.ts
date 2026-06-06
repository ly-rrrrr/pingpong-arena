import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from "../../shared/const.js";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;

// Arena Watcher: dev-only request logging middleware
const devLogging = t.middleware(async (opts) => {
  const start = Date.now();
  const result = await opts.next();
  const durationMs = Date.now() - start;

  if (process.env.NODE_ENV === "development") {
    const path = opts.path;
    const ok = result.ok;
    const userId = opts.ctx.user?.id;

    import("../../server/dev-observer.js")
      .then((m) => {
        m.devLogBackendEvent({
          type: "request",
          message: `${path} ${ok ? "OK" : "ERROR"} ${durationMs}ms`,
          data: {
            method: "tRPC",
            path,
            status: ok ? 200 : 500,
            durationMs,
            user: userId,
          },
        });
      })
      .catch(() => {});
  }

  return result;
});

const baseProcedure = t.procedure.use(devLogging);
export const publicProcedure = baseProcedure;

const requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = baseProcedure.use(requireUser);

export const adminProcedure = baseProcedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);
