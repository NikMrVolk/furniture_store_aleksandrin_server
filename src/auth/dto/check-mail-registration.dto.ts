import { IsEmail, IsNotEmpty, IsString } from 'class-validator'

export class CheckMailRegistrationDto {
    @IsEmail({}, { message: 'Проверьте введённую почту' })
    readonly email: string

    @IsString({ message: 'Некоректное имя пользователя' })
    @IsNotEmpty({ message: 'Имя пользователя не может пыть пустым' })
    readonly name: string

    readonly surname: string
    readonly phone: string
}
