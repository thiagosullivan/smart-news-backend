import Fastify from "fastify";
import { appRoutes } from "./routes";

const app = Fastify({
  logger: process.env.NODE_ENV !== "production",
});

const PORT = parseInt(process.env.PORT || "3333");

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
