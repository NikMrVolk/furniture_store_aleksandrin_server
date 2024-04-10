import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'
import { getJwtConfig } from './config/jwt.config'
import { PrismaService } from 'src/prisma.service'
import { AuthController } from './auth.controller'
import { AuthService } from './services/auth.service'
import { TokensService } from './services/tokens.service'
import { JwtStrategy } from './strategies/jwt.strategy'
import { UserModule } from 'src/user/user.module'
import { SessionsModule } from 'src/sessions/sessions.module'

@Module({
    controllers: [AuthController],
    providers: [AuthService, JwtStrategy, PrismaService, TokensService],
    imports: [
        ConfigModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: getJwtConfig,
        }),
        UserModule,
        SessionsModule,
    ],
    exports: [AuthService, TokensService],
})
export class AuthModule {}
