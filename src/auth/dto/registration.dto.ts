import { IsString, Length } from 'class-validator'
import { CheckMailRegistrationDto } from './check-mail-registration.dto'

export class RegistrationDto extends CheckMailRegistrationDto {
    @IsString({ message: 'Некоректный код активации' })
    @Length(4, 4, { message: 'Код активации должен состоять из 4 цифр' })
    readonly activationCode: string
}
