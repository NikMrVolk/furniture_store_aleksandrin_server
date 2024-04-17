import { IsEmail, IsString, Length } from 'class-validator'

export class LoginDto {
    @IsEmail({}, { message: 'Проверьте введённую почту' })
    readonly email: string

    @IsString({ message: 'Некоректный код активации' })
    @Length(4, 4, { message: 'Код активации должен состоять из 4 цифр' })
    readonly otpCode: string
}
