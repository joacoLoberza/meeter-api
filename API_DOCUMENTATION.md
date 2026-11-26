# 📱 Guía de Integración Meeter API (Mobile & Web)

Documentación oficial de conexión, autenticación y catálogo completo de endpoints para integrar **Meeter API** en aplicaciones desarrolladas con **Flutter** (Mobile Android/iOS y Web).

---

## 🚀 1. Configuración de Conexión en Flutter

En Flutter, la dirección del servidor backend cambia según la plataforma donde estés ejecutando la app. Utiliza esta clase helper en tu proyecto de Flutter para que detecte la URL automáticamente:

### `lib/config/api_config.dart`

```dart
import 'package:flutter/foundation.dart';

class ApiConfig {
  /// Retorna la URL base correspondiente a la plataforma en ejecución
  static String get baseUrl {
    if (kIsWeb) {
      // Flutter Web en el navegador de la PC
      return 'http://localhost:3000';
    } else if (defaultTargetPlatform == TargetPlatform.android) {
      // Emulador Android (Android Studio)
      return 'http://10.0.2.2:3000';
    } else {
      // iOS Simulator o dispositivo en red local (reemplazar por IP local si es celular físico)
      return 'http://localhost:3000';
    }
  }

  // Headers por defecto
  static Map<String, String> headers({String? token}) {
    final map = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (token != null && token.isNotEmpty) {
      map['Authorization'] = 'Bearer $token';
    }
    return map;
  }
}
```

> 💡 **Tip para Celular Físico vía Wi-Fi:** Si pruebas en un celular real (Android o iPhone), reemplaza `http://localhost:3000` por la IP local de tu computadora en la red Wi-Fi (ej: `http://192.168.1.50:3000`).

---

## 🔑 2. Autenticación y Seguridad (JWT)

1. Al realizar `POST /auth/login`, `POST /auth/register` o `POST /auth/google`, la API retorna los datos del usuario incluyendo el token JWT.
2. Almacena el token de forma segura (ej. `flutter_secure_storage` o `shared_preferences`).
3. Adjunta la cabecera `Authorization: Bearer <TOKEN>` en todas las peticiones protegidas.

---

## 📑 3. Catálogo Completo de Endpoints

### 🔐 Autenticación (`/auth`)

#### `POST /auth/register`
- **Descripción:** Registro de un nuevo usuario.
- **Requiere Auth:** No
- **Body (`JSON`):**
```json
{
  "user": "consumidor",
  "name": "Juan Pérez",
  "email": "juan@example.com",
  "password": "mi_password_segura",
  "dni": "12345678",
  "address": "Calle Falsa 123"
}
```

#### `POST /auth/login`
- **Descripción:** Inicio de sesión con email/usuario y contraseña (compatibilidad legacy).
- **Requiere Auth:** No
- **Body (`JSON`):**
```json
{
  "user": "consumidor",
  "password": "mi_password_segura"
}
```

#### `POST /auth/google`
- **Descripción:** Inicia sesión con una cuenta de Google. Si el email no existe, crea la cuenta; si ya existe, vincula la cuenta de Google y conserva su historial. El email se considera verificado por Google.
- **Requiere Auth:** No
- **Body (`JSON`):**
```json
{
  "idToken": "<ID token de Google>"
}
```
- **Respuesta:**
```json
{
  "token": "<JWT de la API>",
  "user": {
    "id": 1,
    "user": "juan",
    "name": "Juan Pérez",
    "email": "juan@example.com",
    "verified": true
  }
}
```
- **Notas:** Requiere `GOOGLE_CLIENT_ID` en el backend. El token se valida con `google-auth-library`; se rechazan los emails no verificados y los tokens inválidos/expirados.

---

### 🎉 Eventos (`/events`)

#### `GET /events`
- **Descripción:** Listar eventos paginados con filtros opcionales.
- **Requiere Auth:** No
- **Query Parameters (Opcionales):**
  - `search` (string): Filtra por nombre o descripción.
  - `category` (number): ID de la categoría.
  - `location` (string): Filtra por ubicación.
  - `initDate` (string): Fecha inicio ISO.
  - `limit` (number): Cantidad por página (default: 20).
  - `cursor` (number): ID del último evento para paginación.

#### `GET /events/:id`
- **Descripción:** Obtener detalle de un evento por ID.
- **Requiere Auth:** Opcional (si se envía token, retorna si el usuario ya es invitado/calificó).

#### `POST /events`
- **Descripción:** Crear un evento.
- **Requiere Auth:** Sí (JWT)
- **Formatos soportados:**
  - `multipart/form-data` (si subes una imagen con el campo `image`).
  - `application/json` (si no incluyes imagen).
- **Body:**
```json
{
  "name": "Fiesta de Fin de Año",
  "description": "Gran evento bailable",
  "initDate": "2026-12-31T21:00:00.000Z",
  "endingDate": "2027-01-01T06:00:00.000Z",
  "location": "Av. Corrientes 1234",
  "categoryFK": 1,
  "ticketPrice": 5000,
  "open": true
}
```

#### `PATCH /events/:id`
- **Descripción:** Actualizar evento existente.
- **Requiere Auth:** Sí (Solo el creador o Admin).

#### `DELETE /events/:id`
- **Descripción:** Eliminar un evento.
- **Requiere Auth:** Sí (Solo el creador o Admin).

#### `POST /events/:id/guests`
- **Descripción:** Agregar un invitado al evento.
- **Requiere Auth:** Sí (Solo el dueño del evento o Admin).
- **Body (`JSON`):**
```json
{
  "userId": 5
}
```

#### `DELETE /events/:id/guests/:guestId`
- **Descripción:** Remover un invitado del evento.
- **Requiere Auth:** Sí.

#### `GET /events/:id/guests`
- **Descripción:** Listar invitados de un evento.
- **Requiere Auth:** Sí.

#### `POST /events/:id/invite`
- **Descripción:** Enviar invitación por email a un usuario.
- **Requiere Auth:** Sí (Solo dueño o Admin).
- **Body (`JSON`):**
```json
{
  "email": "amigo@example.com"
}
```

#### `POST /events/:id/rating`
- **Descripción:** Calificar un evento (1 a 5 estrellas).
- **Requiere Auth:** Sí.
- **Body (`JSON`):**
```json
{
  "rate": 5
}
```

#### `DELETE /events/:id/rating`
- **Descripción:** Eliminar calificación propia de un evento.
- **Requiere Auth:** Sí.

---

### 🏷️ Categorías

#### `GET /events/categories`
- **Descripción:** Listar categorías de eventos.
- **Query:** `since` (opcional).

#### `POST /events/categories`
- **Descripción:** Crear categoría de evento (Admin).
- **Body:** `{ "name": "Música en Vivo" }`

#### `DELETE /events/categories/:id`
- **Descripción:** Eliminar categoría de evento (Admin).

#### `GET /services/categories`
- **Descripción:** Listar categorías de servicios.

#### `POST /services/categories`
- **Descripción:** Crear categoría de servicio (Admin).

---

### 👤 Usuarios (`/users`)

#### `GET /users/:id`
- **Descripción:** Obtener información pública del perfil de un usuario.
- **Requiere Auth:** Sí.

#### `PATCH /users/:id`
- **Descripción:** Modificar datos del perfil propio.
- **Requiere Auth:** Sí.
- **Body (`JSON`):**
```json
{
  "name": "Juan Modificado",
  "email": "nuevo_email@example.com",
  "address": "Nueva Dirección 456"
}
```

#### `DELETE /users/:id`
- **Descripción:** Eliminar cuenta.
- **Requiere Auth:** Sí.

---

### 💬 Chats y Mensajes (`/chats`)

#### `GET /chats/user/:userId`
- **Descripción:** Listar chats activos de un usuario.
- **Requiere Auth:** Sí.

#### `POST /chats`
- **Descripción:** Iniciar un nuevo chat con otro usuario.
- **Requiere Auth:** Sí.
- **Body (`JSON`):**
```json
{
  "recipientId": 8
}
```

#### `GET /chats/:chatId/messages`
- **Descripción:** Obtener el historial de mensajes de una conversación.
- **Requiere Auth:** Sí.

#### `POST /chats/:chatId/messages`
- **Descripción:** Enviar mensaje en una conversación.
- **Requiere Auth:** Sí.
- **Body (`JSON`):**
```json
{
  "content": "¡Hola! ¿Cómo estás?"
}
```

#### `POST /chats/:chatId/comments`
- **Descripción:** Agregar un comentario en el chat.
- **Requiere Auth:** Sí.
- **Body (`JSON`):**
```json
{
  "type": "TEXT",
  "content": "Comentario de prueba"
}
```

#### `GET /chats/:chatId/comments`
- **Descripción:** Obtener comentarios del chat.
- **Requiere Auth:** Sí.

---

### 🛠️ Servicios de Proveedores (`/services`)

#### `GET /services`
- **Descripción:** Listar servicios activos con paginación por cursor y filtros opcionales (incluye filtro geográfico por radio de cobertura).
- **Requiere Auth:** No
- **Query Parameters (Opcionales):**
  - `search` (string): Filtra por nombre o descripción.
  - `cursor` (number): ID para paginación por cursor.
  - `order` (`ASC` | `DESC`, default: `ASC`): Orden de paginación.
  - `limit` (number, default: `10`): Cantidad de resultados.
  - `rating` (number): Calificación mínima.
  - `category` (number): ID de categoría de servicio.
  - `lat` (number) y `lon` (number): Coordenadas del evento para filtrar servicios `HOME` dentro de su `coberRadius` (en km).

#### `GET /services/:id`
- **Descripción:** Obtener detalle completo de un servicio por ID.
- **Requiere Auth:** No

#### `POST /services`
- **Descripción:** Publicar un nuevo servicio.
- **Requiere Auth:** Sí (JWT)
- **Formatos soportados:** `multipart/form-data` (imagen opcional en campo `image`) o `application/json`.
- **Campos:**
  - `name` (string, requerido)
  - `description` (string, requerido)
  - `basePrice` (number/int, requerido)
  - `paymentType` (`PER_HOUR` | `PER_SERVICE` | `PER_PERSON` | `PER_UNIT` | `COMPLETE`, requerido)
  - `receptionType` (`HOME` | `NO_HOME` | `CLOUDE`, requerido)
  - `category` (number/int, requerido): ID de categoría de servicio.
  - `details` (object JSON, opcional)
  - **Requeridos solo si `receptionType === "HOME"`:** `ubication` (string), `latitude` (number), `longitude` (number), `sourceUbication` (string), `coberRadius` (number/int, en km).

#### `PATCH /services/:id`
- **Descripción:** Editar un servicio propio (todos los campos de creación son opcionales; soporta imagen opcional en campo `image`).
- **Requiere Auth:** Sí (JWT, dueño del servicio)

#### `DELETE /services/:id`
- **Descripción:** Eliminar (soft delete) un servicio propio.
- **Requiere Auth:** Sí (JWT, dueño del servicio)

---

### 📱 Posts / Muro Social (`/posts`)

#### `GET /posts`
- **Descripción:** Listar posts del feed con paginación por cursor.
- **Requiere Auth:** No
- **Query Parameters (Opcionales):**
  - `limit` (number, default: `10`)
  - `cursor` (number, default: `0`)
  - `order` (`ASC` | `DESC`, default: `DESC`)

#### `GET /posts/:id`
- **Descripción:** Obtener detalle de un post por ID.
- **Requiere Auth:** No

#### `POST /posts`
- **Descripción:** Crear un post (puede asociarse opcionalmente a un evento mediante `eventId`).
- **Requiere Auth:** Sí (JWT)
- **Formatos soportados:** `multipart/form-data` (hasta 10 archivos en el campo `media`) o `application/json`.
- **Campos (todos opcionales):**
  - `text` (string)
  - `ubication` (string)
  - `isAdd` (boolean, default: `false`)
  - `restrictedComments` (boolean, default: `false`)
  - `eventId` (number/int): ID del evento asociado.

#### `PATCH /posts/:id`
- **Descripción:** Editar un post propio (`text`, `ubication`, `eventId` opcionales).
- **Requiere Auth:** Sí (JWT, autor del post)

#### `DELETE /posts/:id`
- **Descripción:** Eliminar un post propio.
- **Requiere Auth:** Sí (JWT, autor del post)

---

### 💭 Comentarios en Posts (`/comments`)

#### `POST /comments`
- **Descripción:** Comentar un post (admite texto y/o imagen).
- **Requiere Auth:** Sí (JWT)
- **Formatos soportados:** `multipart/form-data` (imagen opcional en campo `image`) o `application/json`.
- **Campos:**
  - `postId` (number/int, requerido)
  - `text` (string, opcional)

#### `PATCH /comments/:id`
- **Descripción:** Editar un comentario propio (`text` e imagen opcional en campo `image`).
- **Requiere Auth:** Sí (JWT, autor del comentario)

#### `DELETE /comments/:id`
- **Descripción:** Eliminar un comentario propio.
- **Requiere Auth:** Sí (JWT, autor del comentario)

#### `POST /comments/:id/like`
- **Descripción:** Dar "Me gusta" a un comentario.
- **Requiere Auth:** Sí (JWT)

#### `DELETE /comments/:id/like`
- **Descripción:** Quitar "Me gusta" de un comentario.
- **Requiere Auth:** Sí (JWT)

---

### 📊 Analíticas de Posts (`/post-view`)

#### `POST /post-view`
- **Descripción:** Registrar métricas de visualización e interacción de un usuario sobre un post (actualiza `interactions` y `rate` del post).
- **Requiere Auth:** Sí (JWT)
- **Body (`JSON`):**
```json
{
  "postId": 12,
  "dwellTime": 8,
  "completionRate": 90,
  "liked": true,
  "commented": false,
  "shared": false,
  "favourite": false,
  "notInterested": false
}
```
- **Campos:** `postId` (int, requerido), `dwellTime` (int >= 0, requerido), `completionRate` (int 0–100, requerido), y booleanos opcionales (`liked`, `commented`, `shared`, `favourite`, `notInterested`).

---

### 🏷️ Etiquetados en Posts (`/tagged`)

#### `POST /tagged`
- **Descripción:** Etiquetar a un usuario en un post.
- **Requiere Auth:** Sí (JWT)
- **Body (`JSON`):**
```json
{
  "postId": 12,
  "userId": 5
}
```

#### `DELETE /tagged/:id`
- **Descripción:** Eliminar una etiqueta por su ID.
- **Requiere Auth:** Sí (JWT)

---

## 🧪 4. Ejemplo de Código en Flutter (Servicio API)

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'api_config.dart';

class EventService {
  static Future<List<dynamic>> fetchEvents() async {
    final response = await http.get(
      Uri.parse('${ApiConfig.baseUrl}/events'),
      headers: ApiConfig.headers(),
    );

    if (response.statusCode == 200) {
      final jsonResponse = jsonDecode(response.body);
      return jsonResponse['data'] as List<dynamic>;
    } else {
      throw Exception('Error al cargar eventos: ${response.statusCode}');
    }
  }
}
```
