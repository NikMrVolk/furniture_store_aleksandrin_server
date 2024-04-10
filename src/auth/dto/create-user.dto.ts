import { IsString, Length } from 'class-validator'
import { CheckMailDto } from './check-mail.dto'

export class CreateUserDto extends CheckMailDto {
    @IsString({ message: 'Некоректный код активации' })
    @Length(4, 4, { message: 'Код активации должен состоять из 4 цифр' })
    readonly activationCode: string
}
