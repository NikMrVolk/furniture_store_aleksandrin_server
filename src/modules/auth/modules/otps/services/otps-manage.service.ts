import { Injectable } from '@nestjs/common'
import { PrismaService } from 'src/utils/services/prisma'
import { SuspiciousDto, SuspiciousQueriesDto } from '../dto'

@Injectable()
export class OtpsManageService {
    constructor(private readonly prisma: PrismaService) {}

    async getAllSuspicious({
        searchMail,
        orderBy = 'desc',
    }: SuspiciousQueriesDto): Promise<SuspiciousDto[]> {
        try {
            return await this.prisma.otpInfo.findMany({
                where: {
                    mailAttempts: {
                        gte: 5,
                    },
                    ...(searchMail ? { emails: { has: searchMail } } : {}),
                },
                orderBy: {
                    createdAt: orderBy,
                },
                select: {
                    id: true,
                    emails: true,
                    updatedAt: true,
                },
            })
        } catch (e) {
            console.error('Get all suspicious error:', e)
            throw e
        }
    }
}
