import { IsEmail, IsNotEmpty, IsString } from 'class-validator'

export class CheckMailDto {
    @IsEmail()
    readonly email: string

    @IsString()
    @IsNotEmpty({ message: 'Имя пользователя не может пыть пустым' })
    readonly name: string

    readonly surname: string
    readonly phone: string
}
