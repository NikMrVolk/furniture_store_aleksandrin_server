import { ConflictException, Injectable } from '@nestjs/common'
import { Provider, Session, User } from '@prisma/client'
import { RegistrationDto } from 'src/modules/auth/dto'
import { PrismaService } from 'src/utils/services/prisma'

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) {}

    async getById(id: number): Promise<User> {
        return this.prisma.user.findUnique({ where: { id } })
    }

    async getUserSessions(id: number): Promise<User & { sessions: Session[] }> {
        return this.prisma.user.findUnique({
            where: { id },
            include: { sessions: true },
        })
    }

    public async getByEmail(email: string): Promise<User> {
        return await this.prisma.user.findUnique({
            where: { email },
        })
    }

    public async checkingUserExistsByEmail(email: string): Promise<void> {
        const user = await this.prisma.user.findUnique({
            where: { email },
        })

        if (user)
            throw new ConflictException(
                `Пользователь с почтой ${email} уже существует`,
            )
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
