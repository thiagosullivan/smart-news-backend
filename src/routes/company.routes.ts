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
    status: string | undefined;
  }[];
  accountsPayable: {
    description: string;
    amount: string;
    dueDate: string;
    createdAt?: string;
    status: string | undefined;
  }[];
}

type AccountStatus = "PENDING" | "PAID" | "OVERDUE" | "CANCELLED";

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

  // Get companies for select with pagination
  app.get(
    "/select",
    async (
      request: FastifyRequest<{
        Querystring: {
          page?: string;
          limit?: string;
          search?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const page = parseInt(request.query.page || "1") || 1;
        const limit = parseInt(request.query.limit || "10") || 10; // 10 por página para o select
        const search = request.query.search || "";
        const skip = (page - 1) * limit;

        const where = search
          ? {
              name: {
                contains: search,
                mode: "insensitive" as const,
              },
            }
          : {};

        const [companies, totalCount] = await Promise.all([
          prisma.company.findMany({
            where,
            select: {
              // Apenas os campos necessários para o select
              id: true,
              name: true,
            },
            orderBy: { name: "asc" },
            skip,
            take: limit,
          }),
          prisma.company.count({ where }),
        ]);

        const hasMore = skip + companies.length < totalCount;

        return {
          companies,
          total: totalCount,
          hasMore,
          nextPage: hasMore ? page + 1 : null,
        };
      } catch (error) {
        console.error("Error fetching companies for select:", error);
        reply.code(500);
        return { error: "Internal server error" };
      }
    }
  );

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

          // 3. Criar Accounts Receivable - CORREÇÃO: usar dados do JSON
          if (accountsReceivable.length > 0) {
            await Promise.all(
              accountsReceivable.map((ar) =>
                tx.accountReceivable.create({
                  data: {
                    description: ar.description,
                    amount: Math.round(parseFloat(ar.amount) * 100),
                    dueDate: new Date(ar.dueDate),
                    status: ar.status || "PENDING", // CORREÇÃO: usar status do JSON
                    receivedDate: ar.receivedDate
                      ? new Date(ar.receivedDate)
                      : null, // CORREÇÃO
                    companyId: company.id,
                    costCenterId: createdCostCenters[0]?.id || null,
                  },
                })
              )
            );
          }

          // 4. Criar Accounts Payable - CORREÇÃO: usar dados do JSON
          if (accountsPayable.length > 0) {
            await Promise.all(
              accountsPayable.map((ap) =>
                tx.accountPayable.create({
                  data: {
                    description: ap.description,
                    amount: Math.round(parseFloat(ap.amount) * 100),
                    dueDate: new Date(ap.dueDate),
                    status: ap.status || "PENDING", // CORREÇÃO: usar status do JSON
                    paidDate: ap.paidDate ? new Date(ap.paidDate) : null, // CORREÇÃO
                    companyId: company.id,
                    costCenterId: createdCostCenters[0]?.id || null,
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

  // Add receivable to existing company
  app.post(
    "/:companyId/receivables",
    async (
      request: FastifyRequest<{
        Params: { companyId: string };
        Body: {
          description: string;
          amount: string;
          dueDate: string;
          status?: AccountStatus;
          receivedDate?: string;
          costCenterId?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const { companyId } = request.params;
      const {
        description,
        amount,
        dueDate,
        status,
        receivedDate,
        costCenterId,
      } = request.body;

      try {
        // Verificar se a company existe
        const company = await prisma.company.findUnique({
          where: { id: companyId },
          include: { costCenters: true },
        });

        if (!company) {
          reply.code(404);
          return { error: "Empresa não encontrada" };
        }

        // Usar o primeiro cost center se não especificado
        const targetCostCenterId = costCenterId || company.costCenters[0]?.id;

        const receivable = await prisma.accountReceivable.create({
          data: {
            description,
            amount: Math.round(parseFloat(amount) * 100),
            dueDate: new Date(dueDate),
            status: status || "PENDING",
            receivedDate: receivedDate ? new Date(receivedDate) : null,
            companyId: companyId,
            costCenterId: targetCostCenterId,
          },
        });

        return {
          message: "Conta a receber adicionada com sucesso",
          receivable,
        };
      } catch (error) {
        console.error(error);
        reply.code(400);
        return { error: "Erro ao adicionar conta a receber" };
      }
    }
  );

  // Add payable to existing company
  app.post(
    "/:companyId/payables",
    async (
      request: FastifyRequest<{
        Params: { companyId: string };
        Body: {
          description: string;
          amount: string;
          dueDate: string;
          status?: AccountStatus;
          paidDate?: string;
          costCenterId?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const { companyId } = request.params;
      const { description, amount, dueDate, status, paidDate, costCenterId } =
        request.body;

      try {
        // Verificar se a company existe
        const company = await prisma.company.findUnique({
          where: { id: companyId },
          include: { costCenters: true },
        });

        if (!company) {
          reply.code(404);
          return { error: "Empresa não encontrada" };
        }

        // Usar o primeiro cost center se não especificado
        const targetCostCenterId = costCenterId || company.costCenters[0]?.id;

        const payable = await prisma.accountPayable.create({
          data: {
            description,
            amount: Math.round(parseFloat(amount) * 100),
            dueDate: new Date(dueDate),
            status: status || "PENDING",
            paidDate: paidDate ? new Date(paidDate) : null,
            companyId: companyId,
            costCenterId: targetCostCenterId,
          },
        });

        return {
          message: "Conta a pagar adicionada com sucesso",
          payable,
        };
      } catch (error) {
        console.error(error);
        reply.code(400);
        return { error: "Erro ao adicionar conta a pagar" };
      }
    }
  );

  // Edit receivables
  app.patch(
    "/:companyId/receivables/:receivableId",
    async (
      request: FastifyRequest<{
        Params: { companyId: string; receivableId: string };
        Body: {
          receivedDate?: string; // ✅ CORRETO
          status?: AccountStatus;
        };
      }>,
      reply: FastifyReply
    ) => {
      const { companyId, receivableId } = request.params;
      const { receivedDate, status } = request.body;

      try {
        // Verificar se o account receivable existe e pertence à company
        const receivable = await prisma.accountReceivable.findFirst({
          where: {
            id: receivableId,
            companyId: companyId,
          },
        });

        if (!receivable) {
          reply.code(404);
          return { error: "Conta a receber não encontrada" };
        }

        const updateData: any = {};

        if (receivedDate !== undefined) {
          updateData.receivedDate = receivedDate
            ? new Date(receivedDate)
            : null;
        }

        if (status !== undefined) {
          updateData.status = status;

          // Se marcar como PAID e não tiver receivedDate, define como agora
          if (status === "PAID" && !receivedDate) {
            updateData.receivedDate = new Date();
          }

          // Se marcar como PENDING e tiver receivedDate, remove o receivedDate
          if (status === "PENDING" && receivedDate === null) {
            updateData.receivedDate = null;
          }
        }

        const updatedReceivable = await prisma.accountReceivable.update({
          where: { id: receivableId },
          data: updateData,
        });

        return {
          message: "Conta a receber atualizada com sucesso",
          receivable: updatedReceivable,
        };
      } catch (error) {
        console.error(error);
        reply.code(400);
        return { error: "Erro ao atualizar conta a receber" };
      }
    }
  );

  // Edit payables
  app.patch(
    "/:companyId/payables/:payableId",
    async (
      request: FastifyRequest<{
        Params: { companyId: string; payableId: string };
        Body: {
          paidDate?: string;
          status?: AccountStatus;
        };
      }>,
      reply: FastifyReply
    ) => {
      const { companyId, payableId } = request.params;
      const { paidDate, status } = request.body;

      try {
        // Verificar se o account payable existe e pertence à company
        const payable = await prisma.accountPayable.findFirst({
          where: {
            id: payableId,
            companyId: companyId,
          },
        });

        if (!payable) {
          reply.code(404);
          return { error: "Conta a pagar não encontrada" };
        }

        const updateData: any = {};

        if (paidDate !== undefined) {
          updateData.paidDate = paidDate ? new Date(paidDate) : null;
        }

        if (status !== undefined) {
          updateData.status = status;

          // Se marcar como PAID e não tiver paidDate, define como agora
          if (status === "PAID" && !paidDate) {
            updateData.paidDate = new Date();
          }

          // Se marcar como PENDING e tiver paidDate, remove o paidDate
          if (status === "PENDING" && paidDate === null) {
            updateData.paidDate = null;
          }
        }

        const updatedPayable = await prisma.accountPayable.update({
          where: { id: payableId },
          data: updateData,
        });

        return {
          message: "Conta a pagar atualizada com sucesso",
          payable: updatedPayable,
        };
      } catch (error) {
        console.error(error);
        reply.code(400);
        return { error: "Erro ao atualizar conta a pagar" };
      }
    }
  );

  // Delete company
  app.delete(
    "/:id",
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const { id } = request.params;

      try {
        // Verificar se a company existe
        const company = await prisma.company.findUnique({
          where: { id },
        });

        if (!company) {
          reply.code(404);
          return { error: "Empresa não encontrada" };
        }

        // Deletar a company (os relacionamentos serão deletados em cascade)
        const deletedCompany = await prisma.company.delete({
          where: { id },
        });

        return {
          message:
            "Empresa e todos os registros relacionados deletados com sucesso",
          company: deletedCompany,
        };
      } catch (error) {
        console.error(error);
        reply.code(400);
        return { error: "Erro ao deletar empresa" };
      }
    }
  );

  // Delete payable
  app.delete(
    "/:companyId/payables/:payableId",
    async (
      request: FastifyRequest<{
        Params: { companyId: string; payableId: string };
      }>,
      reply: FastifyReply
    ) => {
      const { companyId, payableId } = request.params;

      try {
        const payable = await prisma.accountPayable.findFirst({
          where: {
            id: payableId,
            companyId: companyId,
          },
        });

        if (!payable) {
          reply.code(404);
          return { error: "Conta a pagar não encontrada" };
        }

        const deletedPayable = await prisma.accountPayable.delete({
          where: { id: payableId },
        });

        return {
          message: "Conta a pagar deletada com sucesso",
          payable: deletedPayable,
        };
      } catch (error) {
        console.error(error);
        reply.code(400);
        return { error: "Erro ao deletar conta a pagar" };
      }
    }
  );
  // Delete receivable
  app.delete(
    "/:companyId/receivables/:receivableId",
    async (
      request: FastifyRequest<{
        Params: { companyId: string; receivableId: string };
      }>,
      reply: FastifyReply
    ) => {
      const { companyId, receivableId } = request.params;

      try {
        const receivable = await prisma.accountReceivable.findFirst({
          where: {
            id: receivableId,
            companyId: companyId,
          },
        });

        if (!receivable) {
          reply.code(404);
          return { error: "Conta a receber não encontrada" }; // ✅ CORRIGIDO
        }

        const deletedReceivable = await prisma.accountReceivable.delete({
          where: { id: receivableId },
        });

        return {
          message: "Conta a receber deletada com sucesso",
          receivable: deletedReceivable,
        };
      } catch (error) {
        console.error(error);
        reply.code(400);
        return { error: "Erro ao deletar conta a receber" };
      }
    }
  );
}
