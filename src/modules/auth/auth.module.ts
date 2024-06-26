import { Module } from '@nestjs/common'
import { AuthService } from './auth.service'
import { AuthController } from './auth.controller'
import { UsersModule } from '../users/users.module'
import { OtpsModule } from './modules/otps/otps.module'
import { SessionsModule } from './modules/sessions/sessions.module'
import { TokensModule } from './modules/tokens/tokens.module'

@Module({
    imports: [OtpsModule, SessionsModule, TokensModule, UsersModule],
    controllers: [AuthController],
    providers: [AuthService],
    exports: [],
})
export class AuthModule {}
