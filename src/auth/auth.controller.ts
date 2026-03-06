import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../common/dto/error-response.dto';
import { AuthService } from './auth.service';
import { AuthMessageDto } from './dto/auth-message.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({
    summary: 'Registrar usuario',
    description:
      'Crea un nuevo usuario con email y password y devuelve un JWT de acceso.',
  })
  @ApiCreatedResponse({
    type: AuthResponseDto,
    description: 'Usuario registrado correctamente.',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Payload invalido o campos faltantes.',
  })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'El email ya esta registrado.',
  })
  @ApiInternalServerErrorResponse({
    type: ErrorResponseDto,
    description: 'Error interno no esperado.',
  })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @ApiOperation({
    summary: 'Login de usuario',
    description:
      'Valida credenciales y devuelve un JWT de acceso para endpoints protegidos.',
  })
  @ApiCreatedResponse({
    type: AuthResponseDto,
    description: 'Login correcto.',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Payload invalido o campos faltantes.',
  })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'Credenciales invalidas.',
  })
  @ApiInternalServerErrorResponse({
    type: ErrorResponseDto,
    description: 'Error interno no esperado.',
  })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('verify-email')
  @ApiOperation({
    summary: 'Verificar email',
    description:
      'Valida token de verificacion emitido por correo y marca el usuario como verificado.',
  })
  @ApiOkResponse({
    type: AuthMessageDto,
    description: 'Email verificado correctamente.',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Payload invalido o token faltante.',
  })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'Token invalido o expirado.',
  })
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto);
  }

  @Post('refresh')
  @ApiOperation({
    summary: 'Refrescar sesion',
    description:
      'Valida refresh token vigente, lo rota y devuelve nuevos tokens de acceso y refresco.',
  })
  @ApiOkResponse({
    type: AuthResponseDto,
    description: 'Tokens renovados correctamente.',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Payload invalido o token faltante.',
  })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'Refresh token invalido, expirado o revocado.',
  })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto);
  }

  @Post('logout')
  @ApiOperation({
    summary: 'Cerrar sesion',
    description:
      'Revoca un refresh token para impedir futuras renovaciones de sesion.',
  })
  @ApiOkResponse({
    type: AuthMessageDto,
    description: 'Sesion cerrada correctamente.',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Payload invalido o token faltante.',
  })
  logout(@Body() dto: RefreshTokenDto) {
    return this.authService.logout(dto);
  }
}
