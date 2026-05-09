/**
 * DTO para actualización parcial de eventos.
 * Todos los campos son opcionales para que PATCH permita cambios parciales.
 */
export class UpdateEventDto {
  name?: string
  description?: string
  image?: string
  initDate?: string
  endingDate?: string
  location?: string
  open?: boolean
  categoryFK?: number
  ticketPrice?: number
}
