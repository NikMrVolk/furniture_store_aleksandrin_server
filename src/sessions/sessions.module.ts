import { forwardRef, Module } from '@nestjs/common'
import { SessionsController } from './sessions.controller'
import { SessionsService } from './sessions.service'
import { PrismaService } from 'src/prisma.service'
import { UserModule } from 'src/user/user.module'

@Module({
    imports: [forwardRef(() => UserModule)],
    controllers: [SessionsController],
    providers: [SessionsService, PrismaService],
    exports: [SessionsService],
})
export class SessionsModule {}
