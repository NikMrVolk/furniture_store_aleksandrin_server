import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'
import { getJwtConfig } from './config/jwt.config'
import { PrismaService } from 'src/prisma.service'
import { AuthController } from './auth.controller'
import { AuthService } from './services/auth.service'
import { UserService } from './services/user.service'
import { TokensService } from './services/tokens.service'
import { SessionsService } from './services/sessions.service'
import { JwtStrategy } from './strategies/jwt.strategy'
import { GoogleStrategy } from './strategies/google.strategy'
import { HttpModule } from '@nestjs/axios'
import { YandexStrategy } from './strategies/yandex.strategy'

@Module({
    controllers: [AuthController],
    providers: [
        AuthService,
        JwtStrategy,
        GoogleStrategy,
        YandexStrategy,
        UserService,
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
        HttpModule,
    ],
})
export class AuthModule {}
