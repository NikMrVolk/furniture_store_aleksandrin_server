import { Module } from '@nestjs/common'
import { SessionsService } from './sessions.service'
import { UsersModule } from 'src/modules/users/users.module'
import { PrismaService } from 'src/utils/services/prisma'

@Module({
    imports: [UsersModule],
    providers: [SessionsService, PrismaService],
    exports: [SessionsService],
})
export class SessionsModule {}
