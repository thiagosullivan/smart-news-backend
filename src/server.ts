import fastify from "fastify";

const app = fastify({
  //   logger: true,
});

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
