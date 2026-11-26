import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const rawUrl = process.env.DATABASE_URL || ''
    const connectionString = rawUrl.replace(/&channel_binding=[^&]*/g, '').replace(/\?channel_binding=[^&]*&?/g, '?')
    const pool = new Pool({
      connectionString,
      ssl: connectionString.includes('sslmode=') ? { rejectUnauthorized: false } : undefined,
    })
    const adapter = new PrismaPg(pool)
    super({ adapter })
  }

  async onModuleInit() {
    try {
      await this.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS cube;')
      await this.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS earthdistance;')
    } catch {
      // Ignorar si la DB administrada no permite crear extensiones desde este rol
    }
  }

  async onModuleDestroy() {
    await this.$disconnect()
  }
}
