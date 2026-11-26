# 📱 Estado de la API para Conexión Mobile (Flutter / React Native)

Este documento detalla el **estado actual de Meeter API**, clasificando qué endpoints ya se pueden conectar desde una aplicación mobile, qué funcionalidades están modeladas en la base de datos pero aún no están expuestas mediante HTTP/WebSockets, y los requerimientos recomendados para completar la API.

---

## ✅ 1. Lo que SÍ se puede conectar HOY (Endpoints Disponibles)

Estos módulos están 100% operativos en el backend y listos para ser consumidos desde Flutter o cualquier app móvil:

### 🔐 Autenticación (`/auth`)
- `POST /auth/register`: Registro de usuario (Consumidor / Proveedor).
- `POST /auth/login`: Autenticación por email/usuario y contraseña. Retorna JWT Token.

### 👤 Usuarios (`/users`)
- `GET /users/:id`: Obtener perfil público de un usuario.
- `PATCH /users/:id`: Modificar datos del perfil propio (nombre, email, dirección, etc.).
- `DELETE /users/:id`: Eliminar cuenta.

### 🎉 Eventos (`/events`)
- `GET /events`: Listado paginado de eventos (soporta filtros por `search`, `category`, `location`, `initDate`, `limit`, `cursor`).
- `GET /events/:id`: Detalle completo de un evento.
- `POST /events`: Crear evento (soporta upload de imagen vía Cloudinary en `multipart/form-data`).
- `PATCH /events/:id`: Editar evento propio.
- `DELETE /events/:id`: Eliminar evento.
- `GET /events/:id/guests`: Obtener lista de invitados.
- `POST /events/:id/guests`: Añadir invitado al evento.
- `DELETE /events/:id/guests/:guestId`: Eliminar invitado del evento.
- `POST /events/:id/invite`: Enviar tarjeta de invitación por correo electrónico (Resend/EmailService).
- `POST /events/:id/rating`: Calificar evento (1 a 5 estrellas).
- `DELETE /events/:id/rating`: Eliminar calificación propia de un evento.

### 🏷️ Categorías (`/events/categories` y `/services/categories`)
- `GET /events/categories`: Listar categorías de eventos.
- `POST /events/categories` & `DELETE /events/categories/:id`: Gestión admin de categorías de eventos.
- `GET /services/categories`: Listar categorías de servicios.
- `POST /services/categories`: Crear categoría de servicios.

### 💬 Chat Básico HTTP (`/chats`)
- `POST /chats`: Crear conversación directa entre dos usuarios.
- `GET /chats/user/:userId`: Obtener la lista de chats activos del usuario.
- `GET /chats/:chatId/messages`: Historial de mensajes de un chat.
- `POST /chats/:chatId/messages`: Enviar un mensaje vía HTTP REST.
- `GET /chats/:chatId/comments` & `POST /chats/:chatId/comments`: Comentarios/notas dentro del chat.

### 🛠️ Servicios de Proveedores (`/services`)
- `GET /services`: Búsqueda y filtrado de servicios (por texto, categoría, rating, ubicación `lat`/`lon`, paginado por cursor).
- `GET /services/:id`: Detalle del servicio.
- `POST /services`: Publicar un servicio (soporta upload de imagen vía Cloudinary en `multipart/form-data`).
- `PATCH /services/:id` & `DELETE /services/:id`: Edición y eliminación (soft delete) de servicio propio.

### 📱 Muro Social / Feed de Publicaciones (`/posts`, `/comments`, `/tagged`, `/post-view`)
- `GET /posts` & `GET /posts/:id`: Feed social paginado por cursor y detalle de post.
- `POST /posts`: Crear publicación (hasta 10 archivos en `media` vía Cloudinary, opcionalmente vinculada a un `eventId`).
- `PATCH /posts/:id` & `DELETE /posts/:id`: Edición y eliminación de post propio.
- `POST /comments`, `PATCH /comments/:id`, `DELETE /comments/:id`: Comentarios en posts (con imagen opcional) + `POST /comments/:id/like` y `DELETE /comments/:id/like`.
- `POST /tagged` & `DELETE /tagged/:id`: Etiquetar y desetiquetar usuarios en posts.
- `POST /post-view`: Registro de analíticas de visualización/interacción sobre posts.

---

## ⚠️ 2. Lo que NO ESTÁ implementado (Existe en Base de Datos pero FALTA Controlador/Endpoints)

Las siguientes funcionalidades ya poseen su modelo correspondiente en la base de datos Prisma ([`prisma/schema/`](file:///c:/Proyectos/meeter-api/prisma/schema)), pero **no cuentan con controladores ni rutas de API expuestas**:

### 📝 Contratos y Cotizaciones (`/contracts`)
- **Modelo:** `Contrats.prisma`
- **Falta:** 
  - `POST /contracts` (Solicitar cotización / enviar propuesta de servicio para un evento).
  - `GET /contracts/user/:userId` (Listar contrataciones realizadas y recibidas).
  - `PATCH /contracts/:id/status` (Aceptar, rechazar o cancelar un contrato).

### 📅 Agenda y Disponibilidad (`/availability`)
- **Modelo:** `Avilability.prisma`
- **Falta:** 
  - Endpoints para que los proveedores definan sus días/horarios disponibles para eventos.

---

## ⚡ 3. Lo que FALTA AÑADIR (Infraestructura y Características para Mobile)

Para brindar una experiencia móvil fluida e industrial, se recomienda implementar los siguientes componentes backend:

### 1. WebSockets / Mensajería Real-Time (`@nestjs/websockets`)
- **Estado actual:** El chat actual funciona mediante HTTP polling (`POST` y `GET`).
- **Necesario para Mobile:** Conexión bi-direccional Socket.io para:
  - Recepción de mensajes en tiempo real sin recargar la pantalla.
  - Indicadores de estado en línea ("Online/Offline") y "Escribiendo...".
  - Confirmaciones de lectura de mensajes.

### 2. Notificaciones Push (Firebase Cloud Messaging - FCM)
- **Necesario para Mobile:** Enviar notificaciones nativas a Android e iOS cuando:
  - Se recibe un nuevo mensaje de chat.
  - El usuario recibe una invitación a un evento.
  - Se acepta/solicita una contratación de servicio.
- **Requerimiento:** Crear una tabla/campo `fcmToken` en el modelo `User` y un servicio de envío de Push.

### 3. Recuperación de Contraseña y Verificación
- **Falta:**
  - `POST /auth/forgot-password` (Envío de mail con código/link de restablecimiento via `EmailService`).
  - `POST /auth/reset-password` (Cambiar contraseña con token seguro).
  - Endpoints para Token Refresh (`POST /auth/refresh`) para no expirar sesiones sin requerir re-login.

### 4. Upload de Avatares y Archivos Multimedia
- **Estado actual:** Los eventos ya cuentan con subida a Cloudinary, pero no existe un endpoint unificado ni soporte para:
  - Subida e imagen de perfil de usuario (`avatarUrl`).
  - Envío de imágenes/adjuntos en el chat o en las publicaciones.

---

## 📊 Resumen Estadístico de Preparación API

| Módulo | Estado en BD (Prisma) | Estado en API (Controllers) | Conectable con Mobile |
| :--- | :---: | :---: | :---: |
| **Autenticación** | ✅ 100% | ✅ 100% | **SÍ** |
| **Usuarios** | ✅ 100% | ✅ 100% | **SÍ** |
| **Eventos e Invitados** | ✅ 100% | ✅ 100% | **SÍ** |
| **Categorías** | ✅ 100% | ✅ 100% | **SÍ** |
| **Chat (HTTP)** | ✅ 100% | 🟡 80% (Sin WebSockets) | **SÍ (Con Polling)** |
| **Servicios** | ✅ 100% | ✅ 90% (CRUD + Categorías; falta rating de servicio) | **SÍ** |
| **Contratos** | ✅ 100% | ❌ 0% | **NO** |
| **Feed / Posts** | ✅ 100% | ✅ 90% (Posts, Comments, Tagged, Post-View; falta Reactions) | **SÍ** |
| **Push Notifications** | ❌ 0% | ❌ 0% | **NO** |
