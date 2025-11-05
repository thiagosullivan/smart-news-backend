import Fastify from "fastify";
import cors from "@fastify/cors";
import { appRoutes } from "./routes";
import prisma from "./lib/prisma";
import prismaPlugin from "./plugins/prisma";

const app = Fastify({
  logger: process.env.NODE_ENV !== "production",
});

const PORT = parseInt(process.env.PORT || "3333");

// CORS
app.register(cors, {
  origin: true,
  // origin: ["http://localhost:5173", "https://meusite.com"],

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
      port: 3333,
      host: "0.0.0.0",
    });
    console.log("🚀 Server running on http://localhost:3333");
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
