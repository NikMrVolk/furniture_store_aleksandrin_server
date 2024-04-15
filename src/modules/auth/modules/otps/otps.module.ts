import { Module } from '@nestjs/common'
import { MailsModule } from 'src/modules/mails/mails.module'
import { UsersModule } from 'src/modules/users/users.module'
import { PrismaService } from 'src/utils/services/prisma'
import { OtpsBaseService, OtpsHandlersService } from './services'

@Module({
    imports: [MailsModule, UsersModule],
    providers: [OtpsBaseService, OtpsHandlersService, PrismaService],
    exports: [OtpsBaseService],
})
export class OtpsModule {}
