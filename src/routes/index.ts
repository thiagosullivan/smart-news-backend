import { FastifyInstance } from "fastify";
import { userRoutes } from "./user.routes";
import { companyRoutes } from "./company.routes";

export async function appRoutes(app: FastifyInstance) {
  // Regiter User Routes
  app.register(userRoutes, { prefix: "/users" });
  app.register(companyRoutes, { prefix: "/companies" });
}
