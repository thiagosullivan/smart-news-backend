import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

interface UserParams {
  id: string;
}

interface UserBody {
  email: string;
  name?: string;
}

export async function userRoutes(app: FastifyInstance) {
  // GET /users - Listar todos os usuários
  app.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    const users = await app.prisma.user.findMany({
      include: {
        posts: true,
      },
    });
    return { users };
  });

  // GET /users/:id - Buscar usuário por ID
  app.get(
    "/:id",
    async (
      request: FastifyRequest<{ Params: UserParams }>,
      reply: FastifyReply
    ) => {
      const { id } = request.params;

      const user = await app.prisma.user.findUnique({
        where: { id },
        include: { posts: true },
      });

      if (!user) {
        reply.code(404);
        return { error: "Usuário não encontrado" };
      }

      return { user };
    }
  );

  // POST /users - Criar usuário
  app.post(
    "/",
    async (
      request: FastifyRequest<{ Body: UserBody }>,
      reply: FastifyReply
    ) => {
      const { email, name } = request.body;

      try {
        const user = await app.prisma.user.create({
          data: {
            email,
            name,
          },
        });

        return {
          message: "Usuário criado com sucesso",
          user,
        };
      } catch (error) {
        reply.code(400);
        return { error: "Erro ao criar usuário" };
      }
    }
  );

  // PUT /users/:id - Atualizar usuário
  app.put(
    "/:id",
    async (
      request: FastifyRequest<{ Params: UserParams; Body: Partial<UserBody> }>,
      reply: FastifyReply
    ) => {
      const { id } = request.params;
      const { email, name } = request.body;

      try {
        const user = await app.prisma.user.update({
          where: { id },
          data: {
            ...(email && { email }),
            ...(name && { name }),
          },
        });

        return {
          message: "Usuário atualizado com sucesso",
          user,
        };
      } catch (error) {
        reply.code(400);
        return { error: "Erro ao atualizar usuário" };
      }
    }
  );

  // DELETE /users/:id - Deletar usuário
  app.delete(
    "/:id",
    async (
      request: FastifyRequest<{ Params: UserParams }>,
      reply: FastifyReply
    ) => {
      const { id } = request.params;

      try {
        await app.prisma.user.delete({
          where: { id },
        });

        return { message: "Usuário deletado com sucesso" };
      } catch (error) {
        reply.code(400);
        return { error: "Erro ao deletar usuário" };
      }
    }
  );
}
