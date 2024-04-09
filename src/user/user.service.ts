import { Injectable } from '@nestjs/common'
import { Provider, Session, User } from '@prisma/client'
import { PrismaService } from 'src/prisma.service'
import * as bcrypt from 'bcrypt'
import { IUserWithoutPassword } from 'src/shared/types/auth.interface'
import { CreateUserDto } from 'src/auth/dto/create-user.dto'

@Injectable()
export class UserService {
    constructor(private prisma: PrismaService) {}

    async getAll(): Promise<IUserWithoutPassword[]> {
        return this.prisma.user.findMany({
            select: {
                id: true,
                name: true,
                surname: true,
                email: true,
                createdAt: true,
                updatedAt: true,
                roles: true,
                provider: true,
                phone: true,
            },
        })
    }

    async getById(id: number): Promise<User> {
        return this.prisma.user.findUnique({ where: { id } })
    }

    async getUserSessions(id: number): Promise<User & { sessions: Session[] }> {
        return this.prisma.user.findUnique({
            where: { id },
            include: { sessions: true },
        })
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

        if (data.email === process.env.ADMIN_MAIL) {
            return this.prisma.user.create({
                data: {
                    ...data,
                    roles: { set: ['USER', 'ADMIN'] },
                    cart: { create: {} },
                    favourite: { create: {} },
                },
            })
        }

        return this.prisma.user.create({
            data: { ...data, cart: { create: {} }, favourite: { create: {} } },
        })
    }

    async createByOAuth(oAuthData: {
        provider: Provider
        email: string
        name: string | null
        surname: string | null
        phone: string | null
    }): Promise<User> {
        if (oAuthData.email === process.env.ADMIN_MAIL) {
            return this.prisma.user.create({
                data: {
                    ...oAuthData,
                    roles: { set: ['USER', 'ADMIN'] },
                    cart: { create: {} },
                    favourite: { create: {} },
                },
            })
        }

        return this.prisma.user.create({
            data: {
                ...oAuthData,
                cart: { create: {} },
                favourite: { create: {} },
            },
        })
    }
}
