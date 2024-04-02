import { Module } from '@nestjs/common'
import { OAuth2Controller } from './oauth2.controller'
import { OAuth2Service } from './oauth2.service'
import { HttpModule } from '@nestjs/axios'
import { AuthModule } from 'src/auth/auth.module'
import { GoogleStrategy } from './strategies/google.strategy'
import { YandexStrategy } from './strategies/yandex.strategy'

@Module({
    controllers: [OAuth2Controller],
    providers: [OAuth2Service, GoogleStrategy, YandexStrategy],
    imports: [HttpModule, AuthModule],
})
export class OAuth2Module {}
