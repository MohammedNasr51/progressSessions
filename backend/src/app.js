import express from "express";
import { timingSafeEqual } from "node:crypto";
import { cleanSession, isValidMonth, validateSession } from "./validation.js";

function safeEqual(left = "", right = "") {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function createApp({ getCollection, config }) {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "100kb" }));

  app.use((req, res, next) => {
    const origin = req.get("origin")?.replace(/\/$/, "");
    if (origin && config.allowedOrigins.includes(origin)) {
      res.set("Access-Control-Allow-Origin", origin);
      res.set("Vary", "Origin");
      res.set("Access-Control-Allow-Headers", "Content-Type, X-Admin-Key");
      res.set("Access-Control-Allow-Methods", "GET, PUT, DELETE, OPTIONS");
    }
    if (req.method === "OPTIONS") return origin && config.allowedOrigins.includes(origin) ? res.sendStatus(204) : res.sendStatus(403);
    next();
  });

  const requireAdmin = (req, res, next) => {
    if (!safeEqual(req.get("x-admin-key"), config.adminKey)) return res.status(401).json({ error: "Unauthorized" });
    next();
  };

  const requireMonth = (req, res, next) => {
    if (!isValidMonth(req.params.month)) return res.status(400).json({ error: "Month must use YYYY-MM format" });
    next();
  };

  app.get("/", (_req, res) => res.json({ name: "BrightPath Progress API", status: "online" }));
  app.get("/health", (_req, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));

  app.get("/api/months/:month/sessions", requireMonth, async (req, res, next) => {
    try {
      const collection = await getCollection();
      const result = await collection.find({ month: req.params.month }, { projection: { _id: 0, month: 0, updatedAt: 0 } }).sort({ number: 1 }).toArray();
      res.json({ month: req.params.month, sessions: result });
    } catch (error) { next(error); }
  });

  app.put("/api/months/:month/sessions", requireAdmin, requireMonth, async (req, res, next) => {
    try {
      const collection = await getCollection();
      if (!Array.isArray(req.body?.sessions) || req.body.sessions.length > 100) return res.status(400).json({ error: "sessions must be an array containing at most 100 items" });
      const validationErrors = req.body.sessions.flatMap((session, index) => validateSession(session).map((error) => `sessions[${index}]: ${error}`));
      if (validationErrors.length) return res.status(400).json({ error: "Invalid sessions", details: validationErrors });

      const uniqueIds = new Set(req.body.sessions.map((session) => session.id));
      if (uniqueIds.size !== req.body.sessions.length) return res.status(400).json({ error: "Session ids must be unique" });

      const month = req.params.month;
      const records = req.body.sessions.map((session) => ({ ...cleanSession(session), month, updatedAt: new Date() }));
      if (records.length) {
        await collection.bulkWrite(records.map((record) => ({
          updateOne: {
            filter: { month, id: record.id },
            update: { $set: record },
            upsert: true,
          },
        })));
        await collection.deleteMany({ month, id: { $nin: records.map((record) => record.id) } });
      } else {
        await collection.deleteMany({ month });
      }
      res.json({ month, sessions: records.map(({ month: _month, updatedAt: _updatedAt, ...session }) => session) });
    } catch (error) { next(error); }
  });

  app.put("/api/months/:month/sessions/:id", requireAdmin, requireMonth, async (req, res, next) => {
    try {
      const collection = await getCollection();
      const candidate = { ...req.body, id: req.params.id };
      const errors = validateSession(candidate);
      if (errors.length) return res.status(400).json({ error: "Invalid session", details: errors });
      const session = cleanSession(candidate);
      await collection.updateOne({ month: req.params.month, id: session.id }, { $set: { ...session, month: req.params.month, updatedAt: new Date() } }, { upsert: true });
      res.json(session);
    } catch (error) { next(error); }
  });

  app.delete("/api/months/:month/sessions/:id", requireAdmin, requireMonth, async (req, res, next) => {
    try {
      const collection = await getCollection();
      const result = await collection.deleteOne({ month: req.params.month, id: req.params.id });
      if (!result.deletedCount) return res.status(404).json({ error: "Session not found" });
      res.sendStatus(204);
    } catch (error) { next(error); }
  });

  app.use((_req, res) => res.status(404).json({ error: "Route not found" }));
  app.use((error, _req, res, _next) => {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  });
  return app;
}
