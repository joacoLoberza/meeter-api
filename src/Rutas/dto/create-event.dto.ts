/**
 * DTO para la creación de eventos.
 * Se requieren los campos obligatorios del schema y el owner se obtiene desde el token.
 */
export class CreateEventDto {
  name: string
  description?: string
  image?: string
  initDate: string
  endingDate?: string
  location: string
  categoryFK: number
  ticketPrice: number
}
