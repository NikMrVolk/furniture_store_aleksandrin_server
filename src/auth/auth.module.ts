import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'
import { getJwtConfig } from './config/jwt.config'
import { PrismaService } from 'src/prisma.service'
import { AuthController } from './auth.controller'
import { AuthService } from './services/auth.service'
import { TokensService } from './services/tokens.service'
import { SessionsService } from './services/sessions.service'
import { JwtStrategy } from './strategies/jwt.strategy'
import { UserModule } from 'src/user/user.module'

@Module({
    controllers: [AuthController],
    providers: [
        AuthService,
        JwtStrategy,
        PrismaService,
        TokensService,
        SessionsService,
    ],
    imports: [
        ConfigModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: getJwtConfig,
        }),
        UserModule,
    ],
    exports: [AuthService, SessionsService, TokensService],
})
export class AuthModule {}
