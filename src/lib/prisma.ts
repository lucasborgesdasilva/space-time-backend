import { PrismaClient } from '@prisma/client'

export const prisma = new PrismaClient({
  log: ['query'], // Config de Log, para o prisma gerar logs de todas as requisições feitas ao banco de dados
})
