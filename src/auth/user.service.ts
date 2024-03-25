import { Injectable } from '@nestjs/common'
import { User } from '@prisma/client'
import { PrismaService } from 'src/prisma.service'
import { CreateUserDto } from './dto/create-user.dto'
import * as bcrypt from 'bcrypt'
import { IUserWithoutPassword } from './auth.types'

@Injectable()
export class UserService {
    constructor(private prisma: PrismaService) {}

    async getAll(): Promise<IUserWithoutPassword[]> {
        return this.prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                createdAt: true,
                updatedAt: true,
                roles: true
            },
        })
    }

    async getById(id: number): Promise<User> {
        return this.prisma.user.findUnique({ where: { id } })
    }

    async getByEmail(email: string): Promise<User> {
        return this.prisma.user.findUnique({
            where: { email },
        })
    }

    async create(dto: CreateUserDto): Promise<User> {
        const data: CreateUserDto = {
            ...dto,
            password: bcrypt.hashSync(dto.password, 7),
        }

        return this.prisma.user.create({ data })
    }
}
