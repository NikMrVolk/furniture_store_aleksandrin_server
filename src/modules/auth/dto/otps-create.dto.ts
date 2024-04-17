import { IsEmail } from 'class-validator'

export class OtpsCreateDto {
    @IsEmail({}, { message: 'Проверьте введённую почту' })
    readonly email: string

    readonly type: 'login' | 'registration'
}
