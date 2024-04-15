import { IsString, Length } from 'class-validator'
import { CheckMailLoginDto } from './check-mail-login.dto'

export class LoginDto extends CheckMailLoginDto {
    @IsString({ message: 'Некоректный код активации' })
    @Length(4, 4, { message: 'Код активации должен состоять из 4 цифр' })
    readonly otpCode: string
}
