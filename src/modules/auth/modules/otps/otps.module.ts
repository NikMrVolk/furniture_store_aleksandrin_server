import { Module } from '@nestjs/common'
import { MailsModule } from 'src/modules/mails/mails.module'
import { PrismaService } from 'src/utils/services/prisma'
import {
    OtpsBaseService,
    OtpsHandlersService,
    OtpsManageService,
} from './services'
import { OtpsController } from './otps.controller'
import { UsersModule } from 'src/modules/users/users.module'

@Module({
    imports: [MailsModule, UsersModule],
    providers: [
        OtpsBaseService,
        OtpsHandlersService,
        OtpsManageService,
        PrismaService,
    ],
    controllers: [OtpsController],
    exports: [OtpsBaseService],
})
export class OtpsModule {}
