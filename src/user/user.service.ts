import { Injectable } from '@nestjs/common'
import { Provider, Session, User } from '@prisma/client'
import { RegistrationDto } from 'src/auth/dto'
import { PrismaService } from 'src/prisma.service'

@Injectable()
export class UserService {
    constructor(private prisma: PrismaService) {}

    // async getAll(): Promise<IUserWithoutPassword[]> {
    //     return this.prisma.user.findMany({
    //         select: {
    //             id: true,
    //             name: true,
    //             surname: true,
    //             email: true,
    //             createdAt: true,
    //             updatedAt: true,
    //             roles: true,
    //             provider: true,
    //             phone: true,
    //         },
    //     })
    // }

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

    async create(dto: RegistrationDto): Promise<User> {
        return this.prisma.user.create({
            data: {
                email: dto.email,
                profile: {
                    create: {
                        name: dto.name,
                        surname: dto.surname,
                        phone: dto.phone,
                    },
                },
                roles: {
                    set:
                        dto.email === process.env.ADMIN_MAIL
                            ? ['USER', 'ADMIN']
                            : ['USER'],
                },
                cart: { create: {} },
                favorite: { create: {} },
            },
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
                    email: oAuthData.email,
                    profile: {
                        create: {
                            name: oAuthData.name,
                            surname: oAuthData.surname,
                            phone: oAuthData.phone,
                        },
                    },
                    roles: { set: ['USER', 'ADMIN'] },
                    cart: { create: {} },
                    favorite: { create: {} },
                },
            })
        }

        return this.prisma.user.create({
            data: {
                ...oAuthData,
                profile: { create: { ...oAuthData } },
                cart: { create: {} },
                favorite: { create: {} },
            },
        })
    }
}
