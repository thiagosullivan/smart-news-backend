import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import prisma from "../lib/prisma";

interface CompanyParams {
  id: string;
}

interface CompanyBody {
  name: string;
  costCenters: {
    name: string;
    description?: string;
  }[];
  accountsReceivable: {
    description: string;
    amount: string;
    dueDate: string;
    createdAt?: string;
  }[];
  accountsPayable: {
    description: string;
    amount: string;
    dueDate: string;
    createdAt?: string;
  }[];
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

  // Create company
  app.post(
    "/",
    async (
      request: FastifyRequest<{ Body: CompanyBody }>,
      reply: FastifyReply
    ) => {
      const {
        name,
        costCenters = [],
        accountsReceivable = [],
        accountsPayable = [],
      } = request.body;

      try {
        const result = await prisma.$transaction(async (tx) => {
          // 1. Criar a Company primeiro
          const company = await tx.company.create({
            data: { name },
          });

          // 2. Criar Cost Centers
          const createdCostCenters = await Promise.all(
            costCenters.map((cc) =>
              tx.costCenter.create({
                data: {
                  name: cc.name,
                  description: cc.description || null,
                  companyId: company.id,
                },
              })
            )
          );

          // 3. Criar Accounts Receivable
          if (accountsReceivable.length > 0) {
            await Promise.all(
              accountsReceivable.map((ar) =>
                tx.accountReceivable.create({
                  data: {
                    description: ar.description,
                    amount: Math.round(parseFloat(ar.amount) * 100),
                    dueDate: new Date(ar.dueDate),
                    status: "PENDING",
                    companyId: company.id,
                    costCenterId: createdCostCenters[0]?.id || null,
                    // createdAt é automático (@default(now()))
                    // receivedDate é opcional e começa como null
                  },
                })
              )
            );
          }

          // 4. Criar Accounts Payable
          if (accountsPayable.length > 0) {
            await Promise.all(
              accountsPayable.map((ap) =>
                tx.accountPayable.create({
                  data: {
                    description: ap.description,
                    amount: Math.round(parseFloat(ap.amount) * 100),
                    dueDate: new Date(ap.dueDate),
                    status: "PENDING",
                    companyId: company.id,
                    costCenterId: createdCostCenters[0]?.id || null,
                    // createdAt é automático (@default(now()))
                    // paidDate é opcional e começa como null
                  },
                })
              )
            );
          }

          // 5. Retornar a company com todos os relacionamentos
          return await tx.company.findUnique({
            where: { id: company.id },
            include: {
              costCenters: {
                include: {
                  accountsReceivable: true,
                  accountsPayable: true,
                },
              },
              accountsReceivable: true,
              accountsPayable: true,
            },
          });
        });

        return {
          message: "Empresa criada com sucesso",
          company: result,
        };
      } catch (error) {
        console.error(error);
        reply.code(400);
        return { error: "Erro ao criar empresa" };
      }
    }
  );
}
