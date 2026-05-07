/**
 * DTO para la actualización parcial del perfil de usuario.
 * Campos opcionales porque PATCH solo modifica los valores enviados.
 */
export class UpdateUserDto {
  nombre?: string
  email?: string
  avatarUrl?: string
  telefono?: string
  bio?: string
}
