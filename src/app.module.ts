import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AuthModule } from './auth/auth.module'
import { OAuth2Module } from './oauth2/oauth2.module'

@Module({
    imports: [ConfigModule.forRoot(), AuthModule, OAuth2Module],
})
export class AppModule {}
