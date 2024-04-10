import { forwardRef, Module } from '@nestjs/common'
import { UserController } from './user.controller'
import { UserService } from './user.service'
import { PrismaService } from 'src/prisma.service'
import { SessionsModule } from 'src/sessions/sessions.module'

@Module({
    imports: [forwardRef(() => SessionsModule)],
    controllers: [UserController],
    providers: [UserService, PrismaService],
    exports: [UserService],
})
export class UserModule {}
