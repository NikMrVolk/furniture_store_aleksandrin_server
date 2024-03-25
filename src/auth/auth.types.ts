import { User } from '@prisma/client'

export type MyOmit<T, K extends keyof T> = Omit<T, K>

export type IUserWithoutPassword = MyOmit<User, 'password'>

export interface IJwt {
    accessToken: string
    refreshToken: string
}

export type IAuthResponse = IUserWithoutPassword & IJwt

export type IAuthResponseWithoutRefresh = MyOmit<IAuthResponse, 'refreshToken'>

export enum FingerprintKeys {
    SEC_CH_UA = 'sec-ch-ua',
    USER_AGENT = 'user-agent',
    ACCEPT_LANGUAGE = 'accept-language',
}

export enum Tokens {
    REFRESH_TOKEN_NAME = 'refreshToken',
    ACCESS_TOKEN_NAME = 'accessToken',
}
