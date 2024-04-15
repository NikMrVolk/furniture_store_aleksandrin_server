import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'
import { getJwtConfig } from './configs/jwt.config'
import { TokensService } from './tokens.service'
import { JwtStrategy } from './strategies/jwt.strategy'
import { UsersModule } from 'src/modules/users/users.module'

@Module({
    imports: [
        ConfigModule,
        UsersModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: getJwtConfig,
        }),
    ],
    providers: [TokensService, JwtStrategy],
    exports: [TokensService],
})
export class TokensModule {}
