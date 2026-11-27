import { Injectable } from '@nestjs/common'
import * as nodemailer from 'nodemailer'

// El remitente no es una cuenta SMTP: está dado de alta en un archivo del
// servidor Postfix. Postfix autoriza el relay por origen, así que no se envía
// AUTH salvo que exista una contraseña configurada explícitamente.
const SENDER_ADDRESS = process.env.EMAIL_USER || 'no-replay@matriz.social'

const escapeHtml = (value: string): string =>
  String(value ?? '').replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }
    return entities[char] ?? char
  })

// Bloque de presentación que se reutiliza en los correos de la aplicación.
const APP_INFO_HTML = `
  <div style="margin-top:24px;padding:16px;background:#14141D;border:1px solid #28283C;border-radius:16px;">
    <p style="margin:0 0 8px;color:#D4AF37;font-weight:700;font-size:15px;">Sobre Matriz</p>
    <p style="margin:0 0 10px;color:#9C9CB0;font-size:13px;line-height:1.6;">
      Experiencias exclusivas y vida nocturna en un solo lugar.
    </p>
    <ul style="margin:0 0 14px;padding-left:18px;color:#F6F6F8;font-size:13px;line-height:1.7;">
      <li>Descubrí eventos y reservá tu acceso.</li>
      <li>Creá y gestioná tus eventos como organizador, con colaboradores y listas de acceso.</li>
      <li>Seguí a otras personas y chateá con tus amigos.</li>
    </ul>
    <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" style="display:inline-block;padding:10px 18px;background:#D4AF37;color:#0A0A10;text-decoration:none;border-radius:10px;font-weight:700;font-size:13px;">Abrir Matriz</a>
  </div>
`

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter

  constructor() {
    const password = process.env.EMAIL_PASSWORD

    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'mail.matriz.social',
      port: Number(process.env.EMAIL_PORT) || 25,
      secure: false,
      ...(password ? { auth: { user: SENDER_ADDRESS, pass: password } } : {}),
    })
  }

  async sendInvitation(email: string, eventName: string, inviterName: string) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'

    await this.transporter.sendMail({
      from: `"Matriz" <${SENDER_ADDRESS}>`,
      to: email,
      subject: `Invitación a ${escapeHtml(eventName)}`,
      html: `
        <h2>¡Has sido invitado!</h2>
        <p><strong>${escapeHtml(inviterName)}</strong> te ha invitado al evento <strong>${escapeHtml(eventName)}</strong>.</p>
        <p>Haz clic en el siguiente enlace para ver los detalles:</p>
        <a href="${frontendUrl}/events" style="display: inline-block; padding: 10px 20px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 5px;">
          Ver evento
        </a>
      `,
    })
  }

  async sendVerificationEmail(email: string, token: string) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'

    await this.transporter.sendMail({
      from: `"Matriz" <${SENDER_ADDRESS}>`,
      to: email,
      subject: 'Verifica tu cuenta en Matriz',
      html: `
        <h2>Bienvenido a Matriz</h2>
        <p>Haz clic en el siguiente enlace para verificar tu cuenta:</p>
        <a href="${frontendUrl}/verify?token=${token}" style="display: inline-block; padding: 10px 20px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 5px;">
          Verificar cuenta
        </a>
      `,
    })
  }

  /**
   * Avisa al titular de la cuenta que se inició sesión, y aprovecha para
   * mostrar una breve presentación de la aplicación.
   */
  async sendLoginNotification(email: string, name: string, method: string) {
    const when = new Intl.DateTimeFormat('es-AR', {
      dateStyle: 'long',
      timeStyle: 'short',
    }).format(new Date())

    await this.transporter.sendMail({
      from: `"Matriz" <${SENDER_ADDRESS}>`,
      to: email,
      subject: 'Nuevo ingreso a tu cuenta de Matriz',
      html: `
        <div style="background:#0A0A10;color:#F6F6F8;padding:24px;font-family:Arial,sans-serif;">
          <h1 style="margin:0 0 12px;color:#D4AF37;font-size:20px;">Nuevo ingreso detectado</h1>
          <p style="margin:0 0 10px;font-size:14px;line-height:1.6;">Hola ${escapeHtml(name)},</p>
          <p style="margin:0 0 18px;font-size:14px;line-height:1.6;">
            Iniciaste sesión en Matriz con ${escapeHtml(method)}.
          </p>
          <div style="padding:14px;background:#1D1D2B;border-radius:12px;font-size:13px;line-height:1.8;">
            <div><strong>Cuenta:</strong> ${escapeHtml(email)}</div>
            <div><strong>Fecha y hora:</strong> ${escapeHtml(when)}</div>
            <div><strong>Método:</strong> ${escapeHtml(method)}</div>
          </div>
          <p style="margin:18px 0 0;font-size:13px;line-height:1.6;color:#9C9CB0;">
            Si fuiste vos, no tenés que hacer nada. Si no reconocés este ingreso,
            revisá tu cuenta de Google y contactá al equipo de Matriz.
          </p>
          ${APP_INFO_HTML}
          <p style="margin-top:20px;color:#64647C;font-size:11px;">
            Matriz · Experiencias exclusivas y vida nocturna
          </p>
        </div>
      `,
    })
  }
}
