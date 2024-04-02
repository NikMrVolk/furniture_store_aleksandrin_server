import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator'

export class CreateUserDto {
    @IsEmail()
    readonly email: string

    @MinLength(9, {
        message: 'Пароль должен быть больше 8 символов',
    })
    readonly password: string

    @IsString()
    @IsNotEmpty({message: 'Имя пользователя не может пыть пустым'})
    readonly name: string
}
