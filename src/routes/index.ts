import { FastifyInstance } from "fastify";
import { userRoutes } from "./user.routes";

export async function appRoutes(app: FastifyInstance) {
  // Regiter User Routes
  app.register(userRoutes, { prefix: "/users" });
}
