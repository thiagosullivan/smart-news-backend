import Fastify from "fastify";
import cors from "@fastify/cors";
import { appRoutes } from "./routes";
import prisma from "./lib/prisma";
import prismaPlugin from "./plugins/prisma";
import job from "./services/cron";

const app = Fastify({
  logger: process.env.NODE_ENV !== "production",
});

const PORT = parseInt(process.env.PORT || "3333");

if (process.env.NODE_ENV === "production") job.start();

// CORS
app.register(cors, {
  origin: process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(",")
    : ["http://localhost:5173"],
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept"],
  credentials: true,
});

app.register(prismaPlugin);

// Routes
app.register(appRoutes);

// Health check
app.get("/health", async () => {
  return { status: "OK", timestamp: new Date().toISOString() };
});

// Iniciar servidor
const start = async () => {
  try {
    await app.listen({
      port: PORT,
      host: "0.0.0.0",
    });
    console.log(`🚀 Server running on port ${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
