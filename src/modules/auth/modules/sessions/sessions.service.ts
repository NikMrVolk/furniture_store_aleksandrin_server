import { Injectable } from '@nestjs/common'
import { Session } from '@prisma/client'
import { UsersService } from 'src/modules/users/users.service'
import { PrismaService } from 'src/utils/services/prisma'

@Injectable()
export class SessionsService {
    private readonly MAX_SESSIONS_QUANTITY: number = 3
    private readonly SESSIONS_DURATION_DAYS: number = 15

    constructor(
        private prisma: PrismaService,
        private userService: UsersService,
    ) {}

    async createSession({
        userId,
        fingerprint,
        accessToken,
        refreshToken,
    }: {
        userId: number
        fingerprint: string
        accessToken: string
        refreshToken: string
    }): Promise<void> {
        const expiresIn = new Date()
        expiresIn.setDate(expiresIn.getDate() + this.SESSIONS_DURATION_DAYS)

        await this.prisma.session.create({
            data: {
                userId,
                fingerprint,
                accessToken,
                refreshToken,
                expiresIn,
            },
        })
    }

    async addNewTokensToDB({
        userId,
        accessToken,
        oldRefreshToken,
        refreshToken,
    }: {
        userId: number
        accessToken: string
        oldRefreshToken: string
        refreshToken: string
    }): Promise<void> {
        const { sessions } = await this.userService.getUserSessions(userId)

        const currentSession = sessions.find(
            (el) => el.refreshToken === oldRefreshToken,
        )

        if (currentSession) {
            await this.prisma.session.update({
                where: { id: currentSession.id },
                data: { accessToken, refreshToken },
            })
        }
    }

    async checkExpiredSession(session: Session): Promise<boolean> {
        const currentDate = new Date()

        if (currentDate.getTime() > session.expiresIn.getTime()) {
            await this.prisma.session.delete({ where: { id: session.id } })
            return true
        }

        return false
    }

    async checkQuantitySessions(id: number): Promise<void> {
        const { sessions } = await this.userService.getUserSessions(id)

        if (sessions.length === this.MAX_SESSIONS_QUANTITY) {
            const firstSessionId = sessions[0].id

            await this.prisma.session.delete({
                where: { id: firstSessionId },
            })
        }

        if (sessions.length > this.MAX_SESSIONS_QUANTITY) {
            const deletePromises = sessions.map(async (el, id, arr) => {
                if (id < arr.length - (this.MAX_SESSIONS_QUANTITY - 1)) {
                    return await this.prisma.session.delete({
                        where: { id: el.id },
                    })
                }
                return null
            })

            await Promise.all(deletePromises)
        }
    }

    async deleteSessionById(id: number): Promise<void> {
        await this.prisma.session.delete({ where: { id } })
    }

    async deleteSessionByRefreshToken(
        userId: number,
        refreshToken: string,
    ): Promise<void> {
        const { sessions } = await this.userService.getUserSessions(userId)

        const currentSession = sessions.find(
            (el) => el.refreshToken === refreshToken,
        )

        if (currentSession) {
            await this.prisma.session.delete({
                where: { id: currentSession.id },
            })
        }
    }
}
