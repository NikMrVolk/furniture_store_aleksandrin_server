import { Module } from '@nestjs/common'
import { OAuth2Controller } from './oauth2.controller'
import { OAuth2Service } from './oauth2.service'
import { HttpModule } from '@nestjs/axios'
import { GoogleStrategy, MailruStrategy, YandexStrategy } from './strategies'
import { SessionsModule } from '../sessions/sessions.module'
import { UsersModule } from 'src/modules/users/users.module'
import { SessionsRefreshModule } from 'src/utils/services/sessions-refresh/sessions-refresh.module'

@Module({
    imports: [HttpModule, UsersModule, SessionsModule, SessionsRefreshModule],
    controllers: [OAuth2Controller],
    providers: [OAuth2Service, GoogleStrategy, YandexStrategy, MailruStrategy],
})
export class OAuth2Module {}
