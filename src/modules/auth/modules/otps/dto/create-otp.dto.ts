import { IsEmail, IsIn, IsString } from 'class-validator'

export class OtpCreateDto {
    @IsEmail({}, { message: 'Проверьте введённую почту' })
    readonly email: string

    @IsString({ message: 'Поле type должно быть строкой' })
    @IsIn(['login', 'registration'], {
        message: 'Недопустимое значение для поля type',
    })
    readonly type: 'login' | 'registration'
}
