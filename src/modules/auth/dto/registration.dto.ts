import { IsNotEmpty, IsString } from 'class-validator'
import { LoginDto } from './login.dto'

export class RegistrationDto extends LoginDto {
    @IsString({ message: 'Некоректное имя пользователя' })
    @IsNotEmpty({ message: 'Имя пользователя не может пыть пустым' })
    readonly name: string

    readonly surname?: string
    readonly phone?: string
}
