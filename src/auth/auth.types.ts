import { User } from '@prisma/client'

export type MyOmit<T, K extends keyof T> = Omit<T, K>

export type IUserWithoutPassword = MyOmit<User, 'password'>

export interface IJwt {
    accessToken: string
    refreshToken: string
}

export type IAuthResponse = IUserWithoutPassword & IJwt

export type IAuthResponseWithoutRefresh = MyOmit<IAuthResponse, 'refreshToken'>
