# --- ETAPA 1: Construcción (Build) ---
FROM node:20-alpine AS builder

# Instalamos dependencias de sistema para compilar Sharp y Bcrypt en Linux
RUN apk add --no-cache python3 make g++ gcc libc6-compat

WORKDIR /app

# Copiamos archivos de definición de dependencias
COPY package*.json ./
COPY prisma ./prisma/

# Instalamos todas las dependencias (incluyendo NestJS, Sharp, Bcrypt, etc.)
RUN npm install

# Copiamos el resto del código (incluyendo la lógica de Gemini, Cloudinary y Nodemailer)
COPY . .

# Generamos el cliente de Prisma (necesario para TypeScript e IntelliSense)
RUN npx prisma generate

# Compilamos el proyecto de NestJS (de TS a JS en la carpeta /dist)
RUN npm run build

# --- ETAPA 2: Producción (Runtime) ---
FROM node:20-alpine

# Instalamos libvips (necesaria para que Sharp funcione en modo producción en Alpine)
RUN apk add --no-cache libvips-dev

WORKDIR /app

# Copiamos solo lo estrictamente necesario de la etapa anterior
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Exponemos el puerto de comunicación (NestJS/Express suele usar el 3000)
EXPOSE 3000

# Variables de entorno por defecto (se sobreescriben en el docker-compose o .env)
ENV NODE_ENV=production

# Comando de inicio
CMD ["npm", "run", "start:prod"]