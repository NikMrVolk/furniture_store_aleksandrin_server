import { Module } from '@nestjs/common'
import { OAuth2Controller } from './oauth2.controller'
import { OAuth2Service } from './oauth2.service'
import { HttpModule } from '@nestjs/axios'
import { AuthModule } from 'src/auth/auth.module'
import { GoogleStrategy } from './strategies/google.strategy'
import { YandexStrategy } from './strategies/yandex.strategy'
import { MailruStrategy } from './strategies/mailru.strategy'
import { UserModule } from 'src/user/user.module'
import { SessionsModule } from 'src/sessions/sessions.module'

@Module({
    controllers: [OAuth2Controller],
    providers: [OAuth2Service, GoogleStrategy, YandexStrategy, MailruStrategy],
    imports: [HttpModule, AuthModule, UserModule, SessionsModule],
})
export class OAuth2Module {}
