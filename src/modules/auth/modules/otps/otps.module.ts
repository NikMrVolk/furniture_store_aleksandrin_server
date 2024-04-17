import { Module } from '@nestjs/common'
import { MailsModule } from 'src/modules/mails/mails.module'
import { PrismaService } from 'src/utils/services/prisma'
import { OtpsBaseService, OtpsHandlersService } from './services'

@Module({
    imports: [MailsModule],
    providers: [OtpsBaseService, OtpsHandlersService, PrismaService],
    exports: [OtpsBaseService],
})
export class OtpsModule {}
