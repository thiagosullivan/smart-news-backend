import { FastifyInstance } from "fastify";

export async function userRoutes(app: FastifyInstance) {
  // GET /users
  app.get("/", async (request, reply) => {
    return { message: "Lista de usuários", users: [] };
  });

  // GET /users/:id
  app.get("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    return { message: `Usuário ${id}` };
  });

  // POST /users
  app.post("/", async (request, reply) => {
    const user = request.body;
    return { message: "Usuário criado", user };
  });

  // PUT /users/:id
  app.put("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = request.body;
    return { message: `Usuário ${id} atualizado`, user };
  });

  // DELETE /users/:id
  app.delete("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    return { message: `Usuário ${id} deletado` };
  });
}
