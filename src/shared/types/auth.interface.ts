import { $Enums, Provider, User } from '@prisma/client'

export type MyOmit<T, K extends keyof T> = Omit<T, K>

export interface IJwt {
    accessToken: string
    refreshToken: string
}

export type IAuthResponse = User & IJwt

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

export enum CookieNames {
    UNAUTHORIZED_USER_KEY = 'unauthorizedUserKey',
}

export interface IJwtPayload {
    id: number
    fingerprint: string
    roles: $Enums.Role[]
}

export interface IQueryUser {
    token: string
    name?: string | null
    surname?: string | null
    phone?: string | null
}

export interface IOAuth {
    fingerprint: string
    user: IQueryUser
    provider: Provider
    url: string
}
