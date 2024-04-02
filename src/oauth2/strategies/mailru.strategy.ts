import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { Request } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'
import { StrategyCreated, StrategyCreatedStatic } from 'passport'
import { Strategy } from 'passport-oauth-mail-ru'
import { ParsedQs } from 'qs'

@Injectable()
export class MailruStrategy extends PassportStrategy(Strategy, 'mailru') {
    constructor() {
        super({
            clientID: process.env.MAILRU_APP_ID,
            clientSecret: process.env.MAILRU_APP_SECRET,
            callbackURL: process.env.MAILRU_CALLBACK_URL,
        })
    }

    authenticate(
        this: StrategyCreated<this, this & StrategyCreatedStatic>,
        req: Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>>,
        options?: any,
    ) {
        super.authenticate(req, { state: process.env.MAILRU_SECRET_STATE })
    }

    async validate(
        accessToken: string,
        refreshToken: string,
        profile,
        done: (err: any, user: any, info?: any) => void,
    ): Promise<any> {
        const { name, emails } = profile
        const user = {
            email: emails[0].value,
            name: name.givenName,
            surname: name.familyName,
            accessToken,
        }
        done(null, user)
    }
}
