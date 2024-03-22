import { IsEmail, IsString, MinLength } from 'class-validator'

export class CreateUserDto {
    @IsEmail()
    readonly email: string

    @MinLength(9, {
        message: 'Пароль должен быть больше 8 символов',
    })
    readonly password: string

    @IsString()
    readonly name: string
}
