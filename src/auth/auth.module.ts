import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'
import { getJwtConfig } from './config/jwt.config'
import { PrismaService } from 'src/prisma.service'
import { AuthController } from './auth.controller'
import { AuthService } from './services/auth.service'
import { JwtStrategy } from './jwt.strategy'
import { UserService } from './services/user.service'
import { TokensService } from './services/tokens.service'
import { SessionsService } from './services/sessions.service'

@Module({
    controllers: [AuthController],
    providers: [
        AuthService,
        JwtStrategy,
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
    ],
})
export class AuthModule {}
