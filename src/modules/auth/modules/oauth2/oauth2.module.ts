import { Module } from '@nestjs/common'
import { OAuth2Controller } from './oauth2.controller'
import { OAuth2Service } from './oauth2.service'
import { HttpModule } from '@nestjs/axios'
import { GoogleStrategy, MailruStrategy, YandexStrategy } from './strategies'
import { SessionsModule } from '../sessions/sessions.module'
import { UsersModule } from 'src/modules/users/users.module'
import { TokensModule } from '../tokens/tokens.module'

@Module({
    imports: [
        HttpModule,
        UsersModule,
        SessionsModule,
        SessionsModule,
        TokensModule,
    ],
    controllers: [OAuth2Controller],
    providers: [OAuth2Service, GoogleStrategy, YandexStrategy, MailruStrategy],
})
export class OAuth2Module {}
