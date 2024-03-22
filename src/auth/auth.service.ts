import { Injectable } from '@nestjs/common'
import { Prisma, User } from '@prisma/client'
import { PrismaService } from 'src/prisma.service'

@Injectable()
export class AuthService {
    constructor(private prisma: PrismaService) {}

    async registration(data: Prisma.UserCreateInput): Promise<User> {
        return this.prisma.user.create({
            data,
        })
    }

    async getAll(): Promise<User[]> {
        return this.prisma.user.findMany({
            select: { id: true, name: true, email: true },
        })
    }
}
