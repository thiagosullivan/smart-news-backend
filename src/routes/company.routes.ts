import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import prisma from "../lib/prisma";

interface CompanyParams {
  id: string;
}

interface CompanyBody {
  email: string;
  name?: string;
}

export async function companyRoutes(app: FastifyInstance) {
  // Get all companies
  app.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const companies = await app.prisma.company.findMany({
        include: {
          costCenters: true,
          accountsReceivable: true,
          accountsPayable: true,
        },
      });
      return { companies };
    } catch (error) {
      reply.code(404);
      return { error: "Not found" };
    }
  });

  // Get company by id
  app.get(
    "/:id",
    async (
      request: FastifyRequest<{ Params: CompanyParams }>,
      reply: FastifyReply
    ) => {
      const { id } = request.params;

      try {
        const company = await app.prisma.company.findUnique({
          where: { id },
          include: {
            costCenters: true,
            accountsReceivable: true,
            accountsPayable: true,
          },
        });

        if (!company) {
          reply.code(404);
          return { error: "Not found" };
        }

        return { company };
      } catch (error) {
        reply.code(404);
        return { error: "Something went wrong" };
      }
    }
  );
}
