import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { Strategy } from 'passport-yandex'

@Injectable()
export class YandexStrategy extends PassportStrategy(Strategy, 'yandex') {
    constructor() {
        super({
            clientID: process.env.YANDEX_APP_ID,
            clientSecret: process.env.YANDEX_APP_SECRET,
            callbackURL: process.env.YANDEX_CALLBACK_URL,
        })
    }

    async validate(
        accessToken: string,
        refreshToken: string,
        profile: any,
        done: (err: any, user: any, info?: any) => void,
    ): Promise<any> {
        const { emails, _json } = profile
        const user = {
            email: emails[0]?.value,
            name: _json?.first_name,
            surname: _json?.last_name,
            phone: _json?.default_phone?.number,
            accessToken,
        }
        done(null, user)
    }
}
