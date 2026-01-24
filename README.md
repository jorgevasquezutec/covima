# Sistema Programa JA + Asistencia - Especificaciones Técnicas

## 📋 Resumen del Proyecto

Sistema web para gestionar:
1. **Programa JA semanal** - Armar programa, asignar participantes, enviar notificaciones por WhatsApp
2. **Asistencia de Escuela Sabática** - Registro vía WhatsApp con QR, sin necesidad de cuenta

---

## 🚀 Quick Start

### Requisitos
- Node.js 20+
- pnpm
- Docker & Docker Compose

### 1. Levantar servicios (PostgreSQL, Redis, Adminer)
```bash
docker compose up -d
```

### 2. Backend
```bash
cd backend
pnpm install
pnpm db:migrate    # Crea tablas y ejecuta seed
pnpm start:dev     # Inicia en http://localhost:3000
```

### 3. Frontend
```bash
cd frontend
pnpm install
pnpm dev           # Inicia en http://localhost:5173
```

### URLs de desarrollo
| Servicio | URL |
|----------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3000 |
| Adminer (DB GUI) | http://localhost:8080 |
| Prisma Studio | `pnpm db:studio` en backend |

### Credenciales por defecto
- **PostgreSQL**: `postgres:postgres@localhost:5432/covima_ja`
- **Todos los usuarios**: password `password`
- **Admin**: Jorge Vasquez - `+51 940393758`

### Usuarios registrados (31 participantes + 1 admin)
| Nombre | Teléfono |
|--------|----------|
| Jorge Vasquez (admin) | +51 940393758 |
| Damaris | +51 928801948 |
| Elizabhet Bolaños | +51 962236060 |
| Piedad Rivera | +51 957679148 |
| Jean Caso | +51 932287482 |
| Ruth Diaz | +51 963033161 |
| Anyela Calle | +51 993803296 |
| Bryan Chavez | +51 970508614 |
| Pamela Maldonado | +51 984121155 |
| Belen Diaz | +51 933714369 |
| Renzo Higinio | +51 945388949 |
| Liz Delgado | +51 949125725 |
| Carla Delgado | +51 991157405 |
| Kelly Delgado | +51 991018759 |
| Cristhian Ramirez | +51 987622613 |
| Jherson Flores | +51 994727249 |
| Milca Humpiri | +51 966750219 |
| Gina Mamani | +51 951212662 |
| Patricia Tola | +51 927934296 |
| Milli | +51 993211474 |
| Irene | +51 951360200 |
| Diego | +51 932722857 |
| Jose Olivera | +51 996160566 |
| Fernanda Quinto | +51 997170847 |
| Zelo | +51 975662737 |
| Fanny Calderon | +51 963895061 |
| Yuxy | +51 966386930 |
| Nicole Castro | +51 990134132 |
| Xavier | +51 976203046 |
| Lucia | +51 954764679 |
| Alex | +51 939494403 |
| Annie Chavez | +51 902098838 |

### Scripts útiles (backend)
```bash
pnpm db:generate   # Genera cliente Prisma
pnpm db:migrate    # Crea/aplica migraciones + seed
pnpm db:push       # Push rápido sin migración
pnpm db:seed       # Ejecuta seed manualmente
pnpm db:studio     # Abre GUI de Prisma
```

---

## 🏗️ Arquitectura

```
                   jacovima.jvasquez.me
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
     Frontend         Backend           Webhook
   (Vite + React)    (NestJS)      (WhatsApp Meta)
    puerto 5173      puerto 3000
          │                │                │
          └────────────────┼────────────────┘
                           │
                      NestJS API
                           │
                ┌──────────┼──────────┐
                │          │          │
                ▼          ▼          ▼
           PostgreSQL   ChatGPT    WhatsApp
              (DB)       API       Meta API
```

### Estructura de URLs
- `jacovima.jvasquez.me` → Frontend React (Backoffice)
- `jacovima.jvasquez.me/api/*` → Backend NestJS
- `jacovima.jvasquez.me/webhook/*` → Webhooks de WhatsApp

---

## 🔐 Autenticación: Teléfono + Contraseña

### Flujo de registro (Admin)
1. Admin entra al Backoffice
2. Crea usuario: teléfono + nombre + rol
3. Asigna contraseña temporal (ej: "123456")
4. Avisa al usuario por WhatsApp su contraseña

### Flujo de login (Usuario)
1. Usuario ingresa su teléfono
2. Usuario ingresa su contraseña
3. Acceso concedido

### Funcionalidades adicionales
- Usuario puede cambiar su contraseña desde su perfil
- Admin puede resetear contraseña si el usuario la olvida
- Sesión con cookie de 30 días (no pide login cada vez)

---

## 🗄️ Modelo de Datos

### Tabla: `roles`
```sql
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO roles (nombre, descripcion) VALUES
('admin', 'Administrador del sistema - puede todo'),
('lider', 'Líder JA - puede armar programas y ver reportes'),
('participante', 'Miembro del grupo - participa en programas');
```

### Tabla: `usuarios`
```sql
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    codigo_pais VARCHAR(5) NOT NULL DEFAULT '51',  -- Código de país sin + (51 = Perú)
    telefono VARCHAR(20) NOT NULL,                  -- Solo número local (sin código de país)
    telefono_anterior VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,            -- Contraseña hasheada
    nombre VARCHAR(100) NOT NULL,
    nombre_whatsapp VARCHAR(100),
    email VARCHAR(100),
    activo BOOLEAN DEFAULT TRUE,
    debe_cambiar_password BOOLEAN DEFAULT TRUE,     -- Para forzar cambio en primer login
    fecha_cambio_telefono TIMESTAMP,
    ultimo_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(codigo_pais, telefono)                   -- Índice único compuesto
);

CREATE INDEX idx_usuarios_telefono ON usuarios(codigo_pais, telefono);
```

**Nota sobre teléfonos:**
- `codigo_pais`: Código del país SIN el símbolo `+` (ej: `51` para Perú, `1` para USA)
- `telefono`: Solo el número local (ej: `940393758`)
- Para WhatsApp API: concatenar `${codigo_pais}${telefono}` = `51940393758`

### Tabla: `usuarios_roles`
```sql
CREATE TABLE usuarios_roles (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    rol_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    asignado_por INTEGER REFERENCES usuarios(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(usuario_id, rol_id)
);
```

### Tabla: `partes`
Catálogo de partes del programa. La cantidad de participantes es DINÁMICA (no hay límites).

```sql
CREATE TABLE partes (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,
    orden INTEGER NOT NULL,
    es_fija BOOLEAN DEFAULT FALSE,
    texto_fijo VARCHAR(100),
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO partes (nombre, orden, es_fija, texto_fijo) VALUES
('Bienvenida', 1, FALSE, NULL),
('Oración Inicial', 2, FALSE, NULL),
('Espacio de Cantos', 3, FALSE, NULL),
('Oración Intercesora', 4, FALSE, NULL),
('Revivados', 5, FALSE, NULL),
('Tema', 6, FALSE, NULL),
('Notijoven', 7, FALSE, NULL),
('Dinámica', 8, FALSE, NULL),
('Testimonio', 9, FALSE, NULL),
('Especial', 10, FALSE, NULL),
('Recojo de Ofrendas', 11, TRUE, 'Diáconos'),
('Himno Final', 12, FALSE, NULL),
('Oración Final', 13, FALSE, NULL);
```

### Tabla: `usuarios_partes`
Estadísticas de participación para sugerencias inteligentes.

```sql
CREATE TABLE usuarios_partes (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    parte_id INTEGER REFERENCES partes(id) ON DELETE CASCADE,
    ultima_participacion DATE,
    total_participaciones INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(usuario_id, parte_id)
);
```

### Tabla: `programas`
```sql
CREATE TABLE programas (
    id SERIAL PRIMARY KEY,
    fecha DATE NOT NULL UNIQUE,
    titulo VARCHAR(200) DEFAULT 'Programa Maranatha Adoración',
    estado VARCHAR(20) DEFAULT 'borrador',  -- 'borrador', 'completo', 'enviado', 'finalizado'
    texto_generado TEXT,
    creado_por INTEGER REFERENCES usuarios(id),
    enviado_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_programas_fecha ON programas(fecha);
```

### Tabla: `programa_asignaciones`
Participantes asignados a cada parte. DINÁMICO: puede haber 1, 2, 3 o más por parte.

```sql
CREATE TABLE programa_asignaciones (
    id SERIAL PRIMARY KEY,
    programa_id INTEGER REFERENCES programas(id) ON DELETE CASCADE,
    parte_id INTEGER REFERENCES partes(id),
    usuario_id INTEGER REFERENCES usuarios(id),
    orden INTEGER DEFAULT 1,
    notificado BOOLEAN DEFAULT FALSE,
    notificado_at TIMESTAMP,
    confirmado BOOLEAN DEFAULT FALSE,
    confirmado_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_asignaciones_programa ON programa_asignaciones(programa_id);
```

### Tabla: `programa_links`
Links asociados a cada parte. DINÁMICO: puede haber 0, 1, 2 o más links por parte.
- Espacio de Cantos: típicamente 3 links de YouTube (himnos)
- Revivados: 1 link de Kahoot
- Himno Final: 1 link de YouTube
- El nombre se extrae automáticamente del título del video de YouTube

```sql
CREATE TABLE programa_links (
    id SERIAL PRIMARY KEY,
    programa_id INTEGER REFERENCES programas(id) ON DELETE CASCADE,
    parte_id INTEGER REFERENCES partes(id),
    nombre VARCHAR(200) NOT NULL,  -- Extraído de YouTube o manual
    url TEXT NOT NULL,
    orden INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_links_programa ON programa_links(programa_id);
```

### Tabla: `qr_asistencia`
Para generar códigos QR/links de asistencia por semana. Dos tipos de QR.

```sql
CREATE TABLE qr_asistencia (
    id SERIAL PRIMARY KEY,
    semana_inicio DATE NOT NULL,
    codigo VARCHAR(50) NOT NULL UNIQUE,       -- "ASI-2025-W03-WEB" o "ASI-2025-W03-BOT"
    tipo VARCHAR(20) NOT NULL,                -- 'web' o 'bot'
    descripcion VARCHAR(200),
    url_generada TEXT,                        -- URL completa del QR
    activo BOOLEAN DEFAULT TRUE,
    hora_inicio TIME DEFAULT '09:00:00',      -- Hora desde que se puede usar
    hora_fin TIME DEFAULT '12:00:00',         -- Hora hasta que se puede usar
    created_by INTEGER REFERENCES usuarios(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_qr_semana ON qr_asistencia(semana_inicio);
CREATE INDEX idx_qr_tipo ON qr_asistencia(tipo);
```

**Tipos de QR:**
- `web`: Redirige a `jacovima.jvasquez.me/asistencia?code=XXX` → Login → Formulario
- `bot`: Redirige a `wa.me/51999999999?text=ASISTENCIA-XXX` → Bot WhatsApp

### Tabla: `asistencias`
Registro de asistencia presencial. Requiere confirmación del líder/admin.

```sql
CREATE TABLE asistencias (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) NOT NULL,  -- Siempre requerido (debe estar logueado)
    fecha DATE NOT NULL,
    semana_inicio DATE NOT NULL,
    dias_estudio INTEGER CHECK (dias_estudio BETWEEN 1 AND 7),
    hizo_estudio_biblico BOOLEAN,
    metodo_registro VARCHAR(20) NOT NULL,     -- 'qr_web', 'qr_bot', 'plataforma'
    estado VARCHAR(30) DEFAULT 'pendiente_confirmacion',  -- 'pendiente_confirmacion', 'confirmado', 'rechazado'
    confirmado_por INTEGER REFERENCES usuarios(id),  -- Quién confirmó (admin/líder)
    confirmado_at TIMESTAMP,
    notas_confirmacion TEXT,                  -- Razón si fue rechazado
    qr_id INTEGER REFERENCES qr_asistencia(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(usuario_id, semana_inicio)         -- Solo 1 registro por persona por semana
);

CREATE INDEX idx_asistencias_semana ON asistencias(semana_inicio);
CREATE INDEX idx_asistencias_estado ON asistencias(estado);
CREATE INDEX idx_asistencias_usuario ON asistencias(usuario_id);
```

**Estados:**
- `pendiente_confirmacion`: Registró asistencia, esperando verificación del líder
- `confirmado`: Líder verificó que sí asistió ✅
- `rechazado`: Líder verificó que NO asistió (registró desde casa) ❌

**Métodos de registro:**
- `qr_web`: Escaneó QR → Login → Formulario web
- `qr_bot`: Escaneó QR → WhatsApp Bot
- `plataforma`: Directo desde su dashboard (sin QR)

**Restricción horaria:** Solo se puede registrar sábados de 9:00 AM a 12:00 PM (validar en backend)

### Tabla: `conversaciones`
Estado de conversación del bot con cada usuario.

```sql
CREATE TABLE conversaciones (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id),
    telefono VARCHAR(20) NOT NULL,
    estado VARCHAR(50) DEFAULT 'inicio',
    contexto JSONB DEFAULT '{}',
    modulo_activo VARCHAR(50),  -- 'asistencia', 'programa', 'admin'
    programa_en_edicion INTEGER REFERENCES programas(id),
    ultimo_mensaje_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_conversaciones_telefono ON conversaciones(telefono);
```

### Tabla: `mensajes`
Historial de mensajes para contexto de ChatGPT.

```sql
CREATE TABLE mensajes (
    id SERIAL PRIMARY KEY,
    conversacion_id INTEGER REFERENCES conversaciones(id) ON DELETE CASCADE,
    direccion VARCHAR(10) NOT NULL,  -- 'entrada' o 'salida'
    contenido TEXT NOT NULL,
    tipo VARCHAR(20) DEFAULT 'texto',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Tabla: `notificaciones`
Historial de notificaciones enviadas por WhatsApp.

```sql
CREATE TABLE notificaciones (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id),
    telefono VARCHAR(20) NOT NULL,
    tipo VARCHAR(50) NOT NULL,  -- 'asignacion', 'recordatorio', 'programa_completo'
    mensaje TEXT NOT NULL,
    programa_id INTEGER REFERENCES programas(id),
    estado VARCHAR(20) DEFAULT 'pendiente',  -- 'pendiente', 'enviado', 'fallido'
    enviado_at TIMESTAMP,
    error_mensaje TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Tabla: `audit_log`
Auditoría de cambios.

```sql
CREATE TABLE audit_log (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id),
    accion VARCHAR(100) NOT NULL,
    tabla_afectada VARCHAR(50),
    registro_id INTEGER,
    datos_anteriores JSONB,
    datos_nuevos JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 📦 Schema Prisma (para NestJS)

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Rol {
  id          Int           @id @default(autoincrement())
  nombre      String        @unique @db.VarChar(50)
  descripcion String?
  createdAt   DateTime      @default(now()) @map("created_at")
  usuarios    UsuarioRol[]

  @@map("roles")
}

model Usuario {
  id                   Int              @id @default(autoincrement())
  telefono             String           @unique @db.VarChar(20)
  telefonoAnterior     String?          @map("telefono_anterior") @db.VarChar(20)
  passwordHash         String           @map("password_hash") @db.VarChar(255)
  nombre               String           @db.VarChar(100)
  nombreWhatsapp       String?          @map("nombre_whatsapp") @db.VarChar(100)
  email                String?          @db.VarChar(100)
  activo               Boolean          @default(true)
  debeCambiarPassword  Boolean          @default(true) @map("debe_cambiar_password")
  fechaCambioTelefono  DateTime?        @map("fecha_cambio_telefono")
  ultimoLogin          DateTime?        @map("ultimo_login")
  createdAt            DateTime         @default(now()) @map("created_at")
  updatedAt            DateTime         @updatedAt @map("updated_at")

  roles                UsuarioRol[]
  usuarioPartes        UsuarioParte[]
  programasCreados     Programa[]       @relation("ProgramaCreador")
  asignaciones         ProgramaAsignacion[]
  asistencias          Asistencia[]
  asistenciasConfirmadas Asistencia[]   @relation("ConfirmadorAsistencia")
  conversaciones       Conversacion[]
  notificaciones       Notificacion[]
  qrsCreados           QRAsistencia[]
  linksAgregados       ProgramaLink[]
  rolesAsignados       UsuarioRol[]     @relation("AsignadoPor")

  @@map("usuarios")
}

model UsuarioRol {
  id          Int      @id @default(autoincrement())
  usuarioId   Int      @map("usuario_id")
  rolId       Int      @map("rol_id")
  asignadoPor Int?     @map("asignado_por")
  createdAt   DateTime @default(now()) @map("created_at")

  usuario     Usuario  @relation(fields: [usuarioId], references: [id], onDelete: Cascade)
  rol         Rol      @relation(fields: [rolId], references: [id], onDelete: Cascade)
  asignador   Usuario? @relation("AsignadoPor", fields: [asignadoPor], references: [id])

  @@unique([usuarioId, rolId])
  @@map("usuarios_roles")
}

model Parte {
  id            Int         @id @default(autoincrement())
  nombre        String      @unique @db.VarChar(100)
  descripcion   String?
  orden         Int
  esFija        Boolean     @default(false) @map("es_fija")
  textoFijo     String?     @map("texto_fijo") @db.VarChar(100)
  activo        Boolean     @default(true)
  createdAt     DateTime    @default(now()) @map("created_at")

  usuarioPartes UsuarioParte[]
  asignaciones  ProgramaAsignacion[]
  links         ProgramaLink[]

  @@map("partes")
}

model UsuarioParte {
  id                   Int       @id @default(autoincrement())
  usuarioId            Int       @map("usuario_id")
  parteId              Int       @map("parte_id")
  ultimaParticipacion  DateTime? @map("ultima_participacion") @db.Date
  totalParticipaciones Int       @default(0) @map("total_participaciones")
  createdAt            DateTime  @default(now()) @map("created_at")

  usuario              Usuario   @relation(fields: [usuarioId], references: [id], onDelete: Cascade)
  parte                Parte     @relation(fields: [parteId], references: [id], onDelete: Cascade)

  @@unique([usuarioId, parteId])
  @@map("usuarios_partes")
}

model Programa {
  id             Int         @id @default(autoincrement())
  fecha          DateTime    @unique @db.Date
  titulo         String      @default("Programa Maranatha Adoración") @db.VarChar(200)
  estado         String      @default("borrador") @db.VarChar(20)
  textoGenerado  String?     @map("texto_generado")
  creadoPor      Int?        @map("creado_por")
  enviadoAt      DateTime?   @map("enviado_at")
  createdAt      DateTime    @default(now()) @map("created_at")
  updatedAt      DateTime    @updatedAt @map("updated_at")

  creador        Usuario?    @relation("ProgramaCreador", fields: [creadoPor], references: [id])
  asignaciones   ProgramaAsignacion[]
  links          ProgramaLink[]
  notificaciones Notificacion[]
  conversaciones Conversacion[]

  @@map("programas")
}

model ProgramaAsignacion {
  id           Int       @id @default(autoincrement())
  programaId   Int       @map("programa_id")
  parteId      Int       @map("parte_id")
  usuarioId    Int       @map("usuario_id")
  orden        Int       @default(1)
  notificado   Boolean   @default(false)
  notificadoAt DateTime? @map("notificado_at")
  confirmado   Boolean   @default(false)
  confirmadoAt DateTime? @map("confirmado_at")
  createdAt    DateTime  @default(now()) @map("created_at")

  programa     Programa  @relation(fields: [programaId], references: [id], onDelete: Cascade)
  parte        Parte     @relation(fields: [parteId], references: [id])
  usuario      Usuario   @relation(fields: [usuarioId], references: [id])

  @@map("programa_asignaciones")
}

model ProgramaLink {
  id          Int      @id @default(autoincrement())
  programaId  Int      @map("programa_id")
  parteId     Int      @map("parte_id")
  nombre      String   @db.VarChar(200)
  url         String
  orden       Int      @default(1)
  agregadoPor Int?     @map("agregado_por")
  createdAt   DateTime @default(now()) @map("created_at")

  programa    Programa @relation(fields: [programaId], references: [id], onDelete: Cascade)
  parte       Parte    @relation(fields: [parteId], references: [id])
  agregador   Usuario? @relation(fields: [agregadoPor], references: [id])

  @@map("programa_links")
}

model QRAsistencia {
  id           Int          @id @default(autoincrement())
  semanaInicio DateTime     @map("semana_inicio") @db.Date
  codigo       String       @unique @db.VarChar(50)
  tipo         String       @db.VarChar(20)  // 'web' o 'bot'
  descripcion  String?      @db.VarChar(200)
  urlGenerada  String?      @map("url_generada")
  activo       Boolean      @default(true)
  horaInicio   DateTime     @default(dbgenerated("'09:00:00'::time")) @map("hora_inicio") @db.Time()
  horaFin      DateTime     @default(dbgenerated("'12:00:00'::time")) @map("hora_fin") @db.Time()
  createdBy    Int?         @map("created_by")
  createdAt    DateTime     @default(now()) @map("created_at")

  creador      Usuario?     @relation(fields: [createdBy], references: [id])
  asistencias  Asistencia[]

  @@map("qr_asistencia")
}

model Asistencia {
  id                  Int           @id @default(autoincrement())
  usuarioId           Int           @map("usuario_id")
  fecha               DateTime      @db.Date
  semanaInicio        DateTime      @map("semana_inicio") @db.Date
  diasEstudio         Int?          @map("dias_estudio")
  hizoEstudioBiblico  Boolean?      @map("hizo_estudio_biblico")
  metodoRegistro      String        @map("metodo_registro") @db.VarChar(20)  // 'qr_web', 'qr_bot', 'plataforma'
  estado              String        @default("pendiente_confirmacion") @db.VarChar(30)
  confirmadoPor       Int?          @map("confirmado_por")
  confirmadoAt        DateTime?     @map("confirmado_at")
  notasConfirmacion   String?       @map("notas_confirmacion")
  qrId                Int?          @map("qr_id")
  createdAt           DateTime      @default(now()) @map("created_at")

  usuario             Usuario       @relation(fields: [usuarioId], references: [id])
  confirmador         Usuario?      @relation("ConfirmadorAsistencia", fields: [confirmadoPor], references: [id])
  qr                  QRAsistencia? @relation(fields: [qrId], references: [id])

  @@unique([usuarioId, semanaInicio])
  @@map("asistencias")
}

model Conversacion {
  id                Int       @id @default(autoincrement())
  usuarioId         Int?      @map("usuario_id")
  telefono          String    @db.VarChar(20)
  estado            String    @default("inicio") @db.VarChar(50)
  contexto          Json      @default("{}")
  moduloActivo      String?   @map("modulo_activo") @db.VarChar(50)
  programaEnEdicion Int?      @map("programa_en_edicion")
  ultimoMensajeAt   DateTime  @default(now()) @map("ultimo_mensaje_at")
  createdAt         DateTime  @default(now()) @map("created_at")
  updatedAt         DateTime  @updatedAt @map("updated_at")

  usuario           Usuario?  @relation(fields: [usuarioId], references: [id])
  programa          Programa? @relation(fields: [programaEnEdicion], references: [id])
  mensajes          Mensaje[]

  @@map("conversaciones")
}

model Mensaje {
  id             Int          @id @default(autoincrement())
  conversacionId Int          @map("conversacion_id")
  direccion      String       @db.VarChar(10)
  contenido      String
  tipo           String       @default("texto") @db.VarChar(20)
  metadata       Json         @default("{}")
  createdAt      DateTime     @default(now()) @map("created_at")

  conversacion   Conversacion @relation(fields: [conversacionId], references: [id], onDelete: Cascade)

  @@map("mensajes")
}

model Notificacion {
  id           Int       @id @default(autoincrement())
  usuarioId    Int?      @map("usuario_id")
  telefono     String    @db.VarChar(20)
  tipo         String    @db.VarChar(50)
  mensaje      String
  programaId   Int?      @map("programa_id")
  estado       String    @default("pendiente") @db.VarChar(20)
  enviadoAt    DateTime? @map("enviado_at")
  errorMensaje String?   @map("error_mensaje")
  createdAt    DateTime  @default(now()) @map("created_at")

  usuario      Usuario?  @relation(fields: [usuarioId], references: [id])
  programa     Programa? @relation(fields: [programaId], references: [id])

  @@map("notificaciones")
}

model AuditLog {
  id              Int      @id @default(autoincrement())
  usuarioId       Int?     @map("usuario_id")
  accion          String   @db.VarChar(100)
  tablaAfectada   String?  @map("tabla_afectada") @db.VarChar(50)
  registroId      Int?     @map("registro_id")
  datosAnteriores Json?    @map("datos_anteriores")
  datosNuevos     Json?    @map("datos_nuevos")
  createdAt       DateTime @default(now()) @map("created_at")

  @@map("audit_log")
}
```

### Obtener inicio de semana (domingo)
```sql
CREATE OR REPLACE FUNCTION get_inicio_semana(fecha DATE)
RETURNS DATE AS $$
BEGIN
    RETURN fecha - EXTRACT(DOW FROM fecha)::INTEGER;
END;
$$ LANGUAGE plpgsql;
```

### Cambiar teléfono de usuario
```sql
CREATE OR REPLACE FUNCTION cambiar_telefono(p_usuario_id INTEGER, p_nuevo_telefono VARCHAR(20))
RETURNS BOOLEAN AS $$
DECLARE
    v_telefono_actual VARCHAR(20);
BEGIN
    SELECT telefono INTO v_telefono_actual FROM usuarios WHERE id = p_usuario_id;
    
    UPDATE usuarios SET
        telefono_anterior = v_telefono_actual,
        telefono = p_nuevo_telefono,
        fecha_cambio_telefono = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_usuario_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
```

### Sugerir participantes (los que menos han participado)
```sql
CREATE OR REPLACE FUNCTION sugerir_participantes(
    p_parte_id INTEGER,
    p_cantidad INTEGER DEFAULT 3,
    p_excluir_ids INTEGER[] DEFAULT '{}'
)
RETURNS TABLE(usuario_id INTEGER, nombre VARCHAR, telefono VARCHAR, total_participaciones INTEGER) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.nombre,
        u.telefono,
        COALESCE(up.total_participaciones, 0)::INTEGER
    FROM usuarios u
    LEFT JOIN usuarios_partes up ON u.id = up.usuario_id AND up.parte_id = p_parte_id
    WHERE u.activo = TRUE AND u.id != ALL(p_excluir_ids)
    ORDER BY COALESCE(up.total_participaciones, 0) ASC, up.ultima_participacion ASC NULLS FIRST
    LIMIT p_cantidad;
END;
$$ LANGUAGE plpgsql;
```

---

## 🖥️ Backoffice - Módulos

### 1. Dashboard Personal (TODOS los usuarios)
Cada usuario ve su propio dashboard con:
- **Mis estadísticas de asistencia**:
  - Total de asistencias confirmadas
  - Promedio de días de estudio
  - Estudios bíblicos realizados
  - Estado de asistencia esta semana (pendiente/confirmado/no registrado)
- **Mis participaciones en programas**:
  - Historial de partes asignadas
  - Total de participaciones por parte
  - Próximas asignaciones
- **Registrar asistencia** (solo disponible sábados 9am-12pm):
  - Botón para registrar asistencia de esta semana
  - ¿Cuántos días estudiaste la lección? (1-7)
  - ¿Hiciste estudios bíblicos esta semana? (Sí/No)
  - Queda como "pendiente_confirmacion" hasta que líder confirme

### 2. Dashboard del Equipo (solo admin y líder)
Vista general del grupo completo:

#### 2.1 Próximo Programa
- Fecha del próximo sábado
- Estado: borrador / completo / enviado
- Partes asignadas vs pendientes
- Acceso rápido a editar programa

#### 2.2 Dashboard de Participaciones
- **Tabla resumen**: Cada miembro y sus participaciones por parte
- **Gráfico de rotación**: Quién ha participado más/menos
- **Ranking de participaciones**: Top participantes
- **Alerta**: Miembros que no han participado en X semanas
- **Filtros**: Por parte, por fecha, por persona

#### 2.3 Dashboard de Asistencia Escuela Sabática
- **Asistencia presencial**:
  - Total asistentes por semana (gráfico de línea)
  - Promedio de asistencia mensual
  - Tendencia: subiendo/bajando
- **Comparativo**: Presencial vs Diferido
- **Lista**: Quién asistió esta semana

#### 2.4 Métricas de Lectura de Lección
- **Promedio de días de estudio** del grupo (1-7)
- **Gráfico por semana**: Evolución del promedio
- **Distribución**: Cuántos estudian 1 día, 2 días, ..., 7 días
- **Ranking**: Top lectores de lección
- **Alerta**: Miembros con bajo estudio (< 3 días)

#### 2.5 Métricas de Estudios Bíblicos
- **Total de estudios bíblicos** del grupo esta semana/mes
- **Porcentaje**: % del grupo que hizo estudio bíblico
- **Gráfico de tendencia**: Por semana/mes
- **Ranking**: Quiénes hacen más estudios bíblicos
- **Meta**: Progreso hacia meta grupal (si se define)

### 3. Usuarios (solo admin)
- CRUD de usuarios
- Asignar roles (admin, líder, participante)
- Crear usuario con contraseña temporal
- Resetear contraseña
- Cambiar número de teléfono

### 4. Partes del Programa (admin y líder)
- Ver/editar catálogo de partes
- Cambiar orden
- Activar/desactivar partes

### 5. Programas (admin y líder)
- Lista de programas (historial)
- Crear nuevo programa
- Editar programa existente:
  - Asignar participantes a cada parte (1 o más, dinámico)
  - Agregar links a cada parte (1 o más, dinámico)
  - Si es link de YouTube, extraer título automáticamente
- Generar texto del programa (formato WhatsApp)
- Enviar notificaciones a participantes
- Ver estado de confirmaciones

### 6. Asistencia Presencial (admin y líder)
- **Generar QR**:
  - QR tipo Web: Redirige a login → formulario en la plataforma
  - QR tipo Bot: Redirige a WhatsApp → bot registra
- **Configurar horario**: Por defecto sábados 9:00 AM - 12:00 PM
- **Panel de confirmación**:
  - Ver todos los registros "pendiente_confirmacion"
  - Confirmar ✅ o Rechazar ❌ cada asistencia
  - Agregar notas si rechaza (ej: "No estuvo presente")
- **Registro directo**: Opción para que el líder registre asistencia de alguien manualmente
- Ver registros de asistencia por semana
- Exportar a Excel

### 7. Reportes (admin y líder)
- Reporte de participaciones por usuario
- Reporte de rotación de partes
- Reporte de asistencia histórico
- Comparativo presencial vs diferido
- Exportar todos los reportes a Excel/PDF

---

## 🤖 Bot de WhatsApp (Fase 2)

### Funcionalidades para líderes:
- Armar programa conversacionalmente
- ChatGPT ayuda a entender intenciones
- Sugerir participantes
- Agregar links (extrae título de YouTube automáticamente)
- Enviar programa a todos los participantes

### Funcionalidades para asistencia:
- Usuario escanea QR → inicia conversación
- Bot pregunta: "¿Cuántos días estudiaste tu lección? (1-7)"
- Bot pregunta: "¿Hiciste estudios bíblicos esta semana? (Sí/No)"
- Guarda registro con teléfono y nombre de WhatsApp
- Bloquea registro duplicado en la misma semana

---

## 📱 Configuración PWA

### Manifest (manifest.json)
```json
{
  "name": "Jacovima - Sistema JA",
  "short_name": "Jacovima",
  "description": "Sistema de gestión de Programa JA y Asistencia",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#3b82f6",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### Vite Config (vite.config.ts)
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icons/*.png'],
      manifest: {
        name: 'Jacovima - Sistema JA',
        short_name: 'Jacovima',
        theme_color: '#3b82f6',
        icons: [
          { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/jacovima\.jvasquez\.me\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 }
            }
          }
        ]
      }
    })
  ]
})
```

### Características PWA
- **Instalable**: Prompt para agregar a pantalla de inicio
- **Offline**: Cache de assets y API con Workbox
- **Responsive**: Mobile-first, funciona en cualquier dispositivo
- **Notificaciones**: Push notifications para recordatorios (Fase 2)

### Diseño Responsive
- **Mobile** (< 768px): Bottom navigation, cards apiladas
- **Tablet** (768px - 1024px): Sidebar colapsable
- **Desktop** (> 1024px): Sidebar fijo, layout de grid

---

## 🛠️ Stack Tecnológico

### Backend (NestJS)
- **Framework**: NestJS 10.x
- **Base de datos**: PostgreSQL 15+
- **ORM**: Prisma o TypeORM
- **Autenticación**: JWT (teléfono + contraseña)
- **Validación**: class-validator + class-transformer
- **Documentación API**: Swagger
- **Tareas async**: Bull + Redis (para envío de mensajes)

### Frontend (React + Vite + PWA)
- **Build tool**: Vite
- **Framework**: React 18+
- **PWA**: vite-plugin-pwa (Service Worker + Manifest)
- **Routing**: React Router v6
- **Estado**: Zustand o TanStack Query
- **UI**: Tailwind CSS + shadcn/ui
- **HTTP Client**: Axios o fetch
- **Formularios**: React Hook Form + Zod
- **Responsive**: Mobile-first design
- **Offline**: Cache de datos críticos con Service Worker

### Integraciones
- **WhatsApp**: Meta Cloud API
- **IA**: OpenAI API (ChatGPT) para extraer títulos de YouTube y entender intenciones
- **QR**: qrcode.react (frontend) o qrcode (backend)

### Infraestructura
- **Hosting**: Azure VM B1ms (2GB RAM)
- **Dominio**: jacovima.jvasquez.me (subdominio)
- **SSL**: Let's Encrypt (Certbot)
- **Reverse Proxy**: Nginx

---

## 📁 Estructura del Proyecto

```
proyecto-ja/
├── backend/                    # NestJS
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   ├── auth/
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── jwt.strategy.ts
│   │   │   └── dto/
│   │   ├── usuarios/
│   │   │   ├── usuarios.module.ts
│   │   │   ├── usuarios.controller.ts
│   │   │   ├── usuarios.service.ts
│   │   │   ├── entities/
│   │   │   └── dto/
│   │   ├── programas/
│   │   │   ├── programas.module.ts
│   │   │   ├── programas.controller.ts
│   │   │   ├── programas.service.ts
│   │   │   ├── entities/
│   │   │   └── dto/
│   │   ├── asistencia/
│   │   │   ├── asistencia.module.ts
│   │   │   ├── asistencia.controller.ts
│   │   │   ├── asistencia.service.ts
│   │   │   └── dto/
│   │   ├── bot/
│   │   │   ├── bot.module.ts
│   │   │   ├── webhook.controller.ts
│   │   │   ├── bot.service.ts
│   │   │   ├── whatsapp.service.ts
│   │   │   └── chatgpt.service.ts
│   │   ├── prisma/
│   │   │   ├── prisma.module.ts
│   │   │   ├── prisma.service.ts
│   │   │   └── schema.prisma
│   │   └── common/
│   │       ├── guards/
│   │       ├── decorators/
│   │       └── filters/
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                   # Vite + React + PWA
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── ui/            # shadcn/ui components
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── Header.tsx
│   │   │   │   ├── BottomNav.tsx        # Navegación móvil
│   │   │   │   └── Layout.tsx
│   │   │   └── shared/
│   │   ├── pages/
│   │   │   ├── Login.tsx
│   │   │   ├── dashboard/
│   │   │   │   ├── DashboardPersonal.tsx        # Todos los usuarios
│   │   │   │   ├── DashboardEquipo.tsx          # Admin/Líder - Vista general
│   │   │   │   ├── DashboardParticipaciones.tsx # Admin/Líder - Métricas participación
│   │   │   │   ├── DashboardAsistencia.tsx      # Admin/Líder - Métricas asistencia
│   │   │   │   ├── DashboardLeccion.tsx         # Admin/Líder - Métricas lectura lección
│   │   │   │   └── DashboardEstudiosBiblicos.tsx # Admin/Líder - Métricas estudios
│   │   │   ├── perfil/
│   │   │   │   ├── MiPerfil.tsx
│   │   │   │   ├── MisEstadisticas.tsx
│   │   │   │   ├── MisParticipaciones.tsx
│   │   │   │   └── RegistroAsistencia.tsx       # Registro presencial
│   │   │   ├── usuarios/
│   │   │   │   ├── UsuariosList.tsx
│   │   │   │   └── UsuarioForm.tsx
│   │   │   ├── programas/
│   │   │   │   ├── ProgramasList.tsx
│   │   │   │   ├── ProgramaForm.tsx
│   │   │   │   └── ProgramaDetalle.tsx
│   │   │   └── asistencia/
│   │   │       ├── AsistenciaList.tsx
│   │   │       ├── ConfirmarAsistencias.tsx     # Panel de confirmación
│   │   │       ├── QRGenerator.tsx
│   │   │       └── Reportes.tsx
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── useApi.ts
│   │   │   └── usePWA.ts                # Hook para instalación PWA
│   │   ├── services/
│   │   │   ├── api.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── usuarios.service.ts
│   │   │   ├── programas.service.ts
│   │   │   └── asistencia.service.ts
│   │   ├── store/
│   │   │   └── authStore.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   └── lib/
│   │       └── utils.ts
│   ├── public/
│   │   ├── icons/                       # Iconos PWA
│   │   │   ├── icon-192x192.png
│   │   │   ├── icon-512x512.png
│   │   │   └── apple-touch-icon.png
│   │   └── robots.txt
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts                   # Incluye vite-plugin-pwa
│   ├── tailwind.config.js
│   └── tsconfig.json
│
├── docker-compose.yml
├── nginx.conf
└── README.md
```

---

## 🚀 Orden de Implementación

### Fase 1: Setup + Base de datos ✅ COMPLETADO
1. ✅ Crear proyecto NestJS (backend)
2. ✅ Crear proyecto Vite + React (frontend)
3. ✅ Configurar Prisma + PostgreSQL
4. ✅ Crear esquema de base de datos (todas las tablas)
5. ✅ Configurar Docker Compose (PostgreSQL + Redis + Adminer)

### Fase 2: Autenticación ✅ COMPLETADO
1. ✅ Módulo auth en NestJS (JWT)
2. ✅ Login con teléfono + contraseña (con selector de país)
3. ✅ Guards y decoradores (JwtAuthGuard, RolesGuard)
4. ✅ Página de login en React (diseño moderno con react-phone-number-input)
5. ✅ Protección de rutas
6. ✅ Sidebar responsive con navegación
7. ✅ Dashboard con estadísticas (placeholder)

### Fase 3: Backoffice - Usuarios ✅ COMPLETADO
1. ✅ CRUD usuarios (backend)
2. ✅ CRUD roles y asignación
3. ✅ Páginas de usuarios (frontend)
4. ✅ Resetear contraseña

### Fase 4: Backoffice - Programas ✅ COMPLETADO
1. ✅ CRUD partes del programa
2. ✅ CRUD programas
3. ✅ Asignaciones dinámicas (1 o más participantes)
4. ✅ Links dinámicos (YouTube, Kahoot, etc.)
5. ✅ Generación de texto del programa (formato WhatsApp)
6. ✅ Páginas de programas (frontend)
   - Lista de programas con filtros por estado
   - Formulario de creación/edición con partes obligatorias/opcionales
   - Vista previa del texto para WhatsApp
   - Copiar texto al portapapeles

### Fase 5: Backoffice - Asistencia ✅ COMPLETADO
1. ✅ Generador de QR/Link
   - Crear QRs tipo 'web' (abre formulario) o 'bot' (abre WhatsApp)
   - Códigos únicos con formato JA-XXXXXXXX
   - Activar/desactivar QRs
   - Copiar link al portapapeles
2. ✅ Listado de asistencias
   - Tabla con filtros por estado (pendiente, confirmado, rechazado)
   - Selección múltiple para confirmar/rechazar
   - Paginación
3. ✅ Estadísticas y reportes
   - Cards con: Total usuarios, Promedio semanal, Esta semana, Pendientes
   - Historial de últimas 8 semanas
4. ⬜ Exportar a Excel (pendiente)
5. ✅ Páginas de asistencia (frontend)
   - Página principal de gestión de asistencias
   - Página de registro via QR (pública pero requiere login)

### Fase 6: Bot de WhatsApp
1. Configurar webhook de Meta
2. Bot de asistencia (registro vía QR)
3. Bot para líderes (armar programa)
4. Integración con ChatGPT
5. Notificaciones automáticas

### Fase 7: Deploy
1. Configurar VM Azure
2. Nginx como reverse proxy
3. SSL con Let's Encrypt
4. Docker Compose en producción

---

## 📝 Notas Importantes

1. **Participantes dinámicos**: No hay límite de participantes por parte. Puede ser 1, 2, 3 o más.

2. **Links dinámicos**: Cada parte puede tener 0, 1 o más links. Se extrae el título automáticamente de YouTube.

3. **Asistencia presencial con confirmación**:
   - Solo sábados de 9:00 AM a 12:00 PM
   - 3 formas de registrar: QR Web, QR Bot, o directo en plataforma
   - Todas requieren estar logueado (usuario registrado)
   - Todas quedan en estado "pendiente_confirmacion"
   - Líder/Admin debe confirmar ✅ que realmente asistió
   - Evita que registren desde casa

4. **Dos tipos de QR**:
   - `QR Web`: Escanea → Login en jacovima.jvasquez.me → Formulario
   - `QR Bot`: Escanea → Abre WhatsApp → Bot hace preguntas

5. **Dashboard personal**: TODOS los usuarios ven su propio dashboard con sus estadísticas y pueden ver su historial.

6. **Cambio de teléfono**: El sistema soporta cambio de número. El ID interno es la PK, el teléfono es editable.

7. **Autenticación simple**: Login con teléfono + contraseña. Admin puede resetear contraseñas.

8. **Múltiples líderes**: Varios líderes pueden armar programas y confirmar asistencias.

9. **Subdominio**: El sistema corre en `jacovima.jvasquez.me`.

10. **Restricción horaria**: El backend valida que solo se pueda registrar asistencia en el horario configurado (por defecto sábados 9am-12pm).

11. **PWA (Progressive Web App)**:
    - Instalable en celular como app nativa (icono en pantalla)
    - Funciona offline (cache de datos críticos)
    - Responsive: diseño mobile-first
    - Notificaciones push para recordatorios
    - Sin necesidad de publicar en Play Store/App Store

---

## 🎯 Ejemplo de Programa Generado

```
Programa Maranatha Adoración el sábado *06/12/2025*:

*Bienvenida:* Liz Delgado
*Oración Inicial:* Liz Delgado
*Espacio de Cantos:* Patricia Tola, Jose Olivera
- Maranatha [Link](https://www.youtube.com/watch?v=yl_f2GquZqA)
- Himno Adventista 366 - En Cristo hallo amigo [Link](https://www.youtube.com/watch?v=h4FUEtZbd7I)
- Himno Adventista 357 - Jesús, tú eres mi alegría [Link](https://www.youtube.com/watch?v=UWCySwVQOtY)
*Oración Intercesora:* Damaris
*Revivados:* Renzo Higinio, Carla Delgado
- Kahoot Jueces 17-21 [Link](https://create.kahoot.it/share/jueces-17-18-19-20-21-ruth-1-2/96cabc87-621d-4e94-902c-0b4e8bac6781)
*Tema:* Piedad Rivera
*Recojo de Ofrendas:* Diáconos
*Himno Final:*
- Himno Adventista 485 - Unidos en verdad [Link](https://www.youtube.com/watch?v=yer9lSKAMDA)
*Oración Final:* Liz Delgado
```