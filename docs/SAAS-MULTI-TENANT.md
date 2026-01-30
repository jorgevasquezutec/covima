# Transformacion a SaaS Multi-Tenant

Este documento describe los cambios necesarios para convertir la plataforma actual (monolitica, un solo tenant) en un SaaS que soporte multiples tenants (organizaciones/iglesias).

---

## Indice

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Arquitectura Actual](#arquitectura-actual)
3. [Arquitectura Propuesta](#arquitectura-propuesta)
4. [Cambios por Area](#cambios-por-area)
   - [Base de Datos](#1-base-de-datos)
   - [Super Admin](#2-super-admin-administrador-global)
   - [Autenticacion](#3-autenticacion)
   - [Modulos Backend](#4-modulos-backend)
   - [Frontend](#5-frontend)
   - [Integraciones Multi-Tenant](#6-configuracion-de-integraciones-por-tenant)
5. [Plan de Implementacion](#plan-de-implementacion)
6. [Estimacion de Esfuerzo](#estimacion-de-esfuerzo)
7. [Puntos Criticos](#puntos-criticos)

---

## Resumen Ejecutivo

| Aspecto | Actual | Propuesto |
|---------|--------|-----------|
| Modelo | Monolitico (1 org) | Multi-tenant (N organizaciones) |
| Usuarios | Globales | Por tenant (pueden estar en varios) |
| Roles | Fijos globales | Por tenant (admin en A, participante en B) |
| Datos | Sin aislamiento | Aislados por `tenantId` |
| WhatsApp | 1 numero | 1 numero por tenant (credenciales propias) |
| Webhook | 1 global | 1 por tenant (`/webhook/whatsapp/:codigo`) |

**Esfuerzo total estimado:** 180-265 horas (~5-7 semanas, 1 dev full-time)

---

## Arquitectura Actual

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                      │
│  Login → Dashboard → Programas/Asistencia/Inbox/Usuarios │
└─────────────────────────┬───────────────────────────────┘
                          │ HTTP + WebSocket
┌─────────────────────────▼───────────────────────────────┐
│                    BACKEND (NestJS)                      │
│  ┌─────────┐ ┌──────────┐ ┌───────────┐ ┌─────────────┐ │
│  │  Auth   │ │ Programas│ │ Asistencia│ │ WhatsApp Bot│ │
│  └─────────┘ └──────────┘ └───────────┘ └─────────────┘ │
│  ┌─────────┐ ┌──────────┐ ┌───────────┐                 │
│  │ Usuarios│ │   Inbox  │ │   Tipos   │                 │
│  └─────────┘ └──────────┘ └───────────┘                 │
└─────────────────────────┬───────────────────────────────┘
                          │
         ┌────────────────┼────────────────┐
         ▼                ▼                ▼
    ┌─────────┐      ┌─────────┐      ┌─────────┐
    │PostgreSQL│      │  Redis  │      │WhatsApp │
    │ (Prisma) │      │ (Cache) │      │Cloud API│
    └─────────┘      └─────────┘      └─────────┘
```

### Modulos Actuales

| Modulo | Descripcion | Lineas |
|--------|-------------|--------|
| `auth/` | JWT, login, guards | ~300 |
| `usuarios/` | CRUD usuarios, roles | ~400 |
| `programas/` | Programas, parsing IA, notificaciones | ~1950 |
| `asistencia/` | QR, registro, WebSocket room | ~600 |
| `whatsapp-bot/` | Webhook, intent routing, OpenAI | ~800 |
| `inbox/` | Conversaciones, handoff | ~500 |

---

## Arquitectura Propuesta

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                      │
│  Login → [Selector Tenant] → Dashboard → Modulos         │
│           ▲                                              │
│           │ Header: "Mi Organizacion ▼"                  │
└─────────────────────────┬───────────────────────────────┘
                          │ HTTP (X-Tenant-Id header)
                          │ WebSocket (/tenant-{id}/...)
┌─────────────────────────▼───────────────────────────────┐
│                    BACKEND (NestJS)                      │
│  ┌─────────────────────────────────────────────────────┐│
│  │              TenantMiddleware                        ││
│  │  (Extrae tenantId del JWT/header, valida acceso)   ││
│  └─────────────────────────────────────────────────────┘│
│  ┌─────────┐ ┌──────────┐ ┌───────────┐ ┌─────────────┐ │
│  │  Auth   │ │ Programas│ │ Asistencia│ │ WhatsApp Bot│ │
│  │+iglesia │ │+tenantId│ │+tenantId │ │+mapeo tel→ig│ │
│  └─────────┘ └──────────┘ └───────────┘ └─────────────┘ │
└─────────────────────────┬───────────────────────────────┘
                          │
    ┌─────────────────────▼─────────────────────┐
    │              PostgreSQL                    │
    │  ┌─────────┐                              │
    │  │ Iglesia │◄──────┐                      │
    │  └─────────┘       │ tenantId (FK)       │
    │       ▲            │                      │
    │       │            ▼                      │
    │  ┌─────────┐  ┌─────────┐  ┌───────────┐ │
    │  │Usuarios │  │Programas│  │Asistencias│ │
    │  └─────────┘  └─────────┘  └───────────┘ │
    └───────────────────────────────────────────┘
```

---

## Cambios por Area

### 1. Base de Datos

#### Nuevas Tablas

```prisma
// Tenant principal
model Tenant {
  id                Int       @id @default(autoincrement())
  nombre            String    @unique
  codigo            String    @unique // ej: "mi-organizacion"
  direccion         String?
  ciudad            String?
  pais              String    @default("Peru")
  telefonoContacto  String?
  correoContacto    String?
  logoUrl           String?

  // Suscripcion
  plan              String    @default("free") // free, basic, pro
  limiteUsuarios    Int       @default(50)
  limiteProgramas   Int       @default(10) // por mes

  activo            Boolean   @default(true)
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  // Relaciones
  usuarios          UsuarioTenant[]
  programas         Programa[]
  asistencias       Asistencia[]
  conversaciones    Conversacion[]
  partes            Parte[]
  tiposAsistencia   TipoAsistencia[]
  integraciones     TenantIntegraciones?

  @@map("tenants")
}

model UsuarioTenant {
  id          Int       @id @default(autoincrement())
  usuarioId   Int
  tenantId    Int
  rol         String    @default("participante") // owner, admin, lider, participante
  activo      Boolean   @default(true)
  createdAt   DateTime  @default(now())

  usuario     Usuario   @relation(fields: [usuarioId], references: [id])
  tenant      Tenant    @relation(fields: [tenantId], references: [id])

  @@unique([usuarioId, tenantId])
  @@map("usuarios_tenants")
}
```

#### Cambios en Tablas Existentes

```prisma
model Usuario {
  // ... campos existentes ...

  // NUEVO: Relacion con tenants
  tenants     UsuarioTenant[]
}

model Programa {
  // ... campos existentes ...

  // NUEVO
  tenantId    Int
  tenant      Tenant @relation(fields: [tenantId], references: [id])

  // CAMBIO: Codigo unico por tenant
  @@unique([tenantId, codigo])
}

model Parte {
  // ... campos existentes ...

  // NUEVO
  tenantId    Int
  tenant      Tenant @relation(fields: [tenantId], references: [id])

  // CAMBIO: Nombre unico por tenant
  @@unique([tenantId, nombre])
}

model Asistencia {
  // ... campos existentes ...

  // NUEVO
  tenantId    Int
  tenant      Tenant @relation(fields: [tenantId], references: [id])
}

model TipoAsistencia {
  // ... campos existentes ...

  // NUEVO
  tenantId    Int
  tenant      Tenant @relation(fields: [tenantId], references: [id])

  @@unique([tenantId, nombre])
}

model Conversacion {
  // ... campos existentes ...

  // NUEVO
  tenantId    Int
  tenant      Tenant @relation(fields: [tenantId], references: [id])
}
```

**Complejidad:** MEDIA-ALTA | **Esfuerzo:** 20-30 horas

---

### 2. Super Admin (Administrador Global)

El Super Admin es un usuario especial que tiene acceso a **todos los tenants** y puede administrar la plataforma completa.

#### Tabla SuperAdmin

```prisma
model SuperAdmin {
  id          Int       @id @default(autoincrement())
  usuarioId   Int       @unique
  permisos    String[]  @default(["all"])
  activo      Boolean   @default(true)
  createdAt   DateTime  @default(now())

  usuario     Usuario   @relation(fields: [usuarioId], references: [id])

  @@map("super_admins")
}
```

#### JWT Payload para Super Admin

```typescript
// Usuario normal
{
  sub: 1,
  tenant: { id: 1, nombre: "Mi Org" },
  tenants: [...],
  roles: ["admin"],
  isSuperAdmin: false
}

// Super Admin
{
  sub: 99,
  tenant: null,              // No tiene tenant por defecto
  tenants: [],               // Puede acceder a todos
  roles: ["super_admin"],
  isSuperAdmin: true
}
```

#### Guard de Super Admin

```typescript
@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest().user;
    if (!user?.isSuperAdmin) {
      throw new ForbiddenException('Acceso solo para Super Admin');
    }
    return true;
  }
}
```

#### API de Administracion Global

```typescript
@Controller('admin')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class AdminController {

  // Listar todos los tenants
  @Get('tenants')
  async listTenants() {
    return this.prisma.tenant.findMany({
      include: {
        _count: { select: { usuarios: true, programas: true } },
        integraciones: { select: { whatsappActivo: true, openaiActivo: true } }
      }
    });
  }

  // Crear tenant
  @Post('tenants')
  async createTenant(@Body() dto: CreateTenantDto) { }

  // Suspender tenant
  @Post('tenants/:id/suspend')
  async suspendTenant(@Param('id') id: number) { }

  // Impersonar (soporte tecnico)
  @Post('tenants/:id/impersonate')
  async impersonate(@Param('id') id: number) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    return {
      accessToken: this.jwtService.sign({
        sub: this.request.user.sub,
        tenant: { id: tenant.id, nombre: tenant.nombre },
        roles: ['admin'],
        isSuperAdmin: true,
        impersonating: true,
      }),
    };
  }

  // Estadisticas globales
  @Get('stats')
  async getStats() {
    return {
      totalTenants: await this.prisma.tenant.count(),
      totalUsuarios: await this.prisma.usuario.count(),
      totalProgramas: await this.prisma.programa.count(),
    };
  }
}
```

#### Frontend: Panel de Super Admin

| Seccion | Descripcion |
|---------|-------------|
| Dashboard | Stats globales (tenants, usuarios, programas) |
| Tenants | Lista de tenants con acciones (editar, suspender, impersonar) |
| Crear Tenant | Formulario para nuevo tenant |
| Configuracion | Plantillas por defecto, planes, limites |
| Logs | Auditoria global del sistema |

#### Permisos del Super Admin

| Permiso | Descripcion |
|---------|-------------|
| `all` | Acceso total |
| `tenants.read` | Ver lista de tenants |
| `tenants.write` | Crear/editar tenants |
| `tenants.impersonate` | "Ver como" admin de un tenant |
| `billing` | Gestionar planes y pagos |
| `config` | Configuracion global |

**Complejidad:** MEDIA | **Esfuerzo adicional:** 10-15 horas

---

### 3. Autenticacion

#### JWT Payload Actual vs Propuesto

```typescript
// ACTUAL
{
  sub: 1,
  nombre: "Jorge",
  telefono: "940393758",
  roles: ["admin", "lider"]
}

// PROPUESTO
{
  sub: 1,
  nombre: "Jorge",
  telefono: "940393758",
  tenant: {
    id: 1,
    nombre: "Mi Organizacion",
    codigo: "mi-org"
  },
  tenants: [
    { id: 1, nombre: "Mi Organizacion", rol: "admin" },
    { id: 2, nombre: "Otra Org", rol: "participante" }
  ],
  roles: ["admin"] // roles en tenant activo
}
```

#### Nuevos Endpoints

```typescript
// Cambiar tenant activo
POST /auth/switch-tenant
Body: { tenantId: 2 }
Response: { accessToken: "...", tenant: {...} }

// Obtener tenants del usuario
GET /auth/mis-tenants
Response: [{ id: 1, nombre: "...", rol: "admin" }, ...]
```

#### Nuevo Middleware

```typescript
// tenant.middleware.ts
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const user = req.user;
    const tenantId = req.headers['x-tenant-id'] || user?.tenant?.id;

    if (!tenantId) {
      throw new BadRequestException('Tenant no especificado');
    }

    // Validar que usuario tiene acceso
    const tieneAcceso = user.tenants.some(t => t.id === Number(tenantId));
    if (!tieneAcceso) {
      throw new ForbiddenException('No tienes acceso a este tenant');
    }

    req['tenantId'] = Number(tenantId);
    next();
  }
}
```

**Complejidad:** MEDIA | **Esfuerzo:** 15-20 horas

---

### 4. Modulos Backend

#### Patron de Cambio (aplicar a todos los servicios)

```typescript
// ANTES
async findAll() {
  return this.prisma.programa.findMany({
    orderBy: { fecha: 'desc' }
  });
}

// DESPUES
async findAll(tenantId: number) {
  return this.prisma.programa.findMany({
    where: { tenantId }, // <-- filtro por iglesia
    orderBy: { fecha: 'desc' }
  });
}
```

#### Cambios por Modulo

| Modulo | Cambios | Complejidad |
|--------|---------|-------------|
| `programas/` | Agregar `tenantId` a queries, partes por tenant | MEDIA |
| `asistencia/` | QR por tenant, tipos por tenant, WebSocket namespace | MEDIA |
| `usuarios/` | Relacion muchos-a-muchos, roles por tenant | MEDIA |
| `whatsapp-bot/` | Mapeo telefono→tenant, credenciales por tenant | ALTA |
| `inbox/` | Conversaciones por tenant, admins por tenant | MEDIA |

#### WhatsApp Bot (mas complejo)

Con webhooks por tenant, el problema se simplifica:

```typescript
// ANTES: Webhook global, necesitabamos mapear telefono → tenant
// AHORA: Webhook por tenant, ya sabemos el tenant desde la URL

// POST /webhook/whatsapp/:codigoTenant
async handleWebhook(codigoTenant: string, body: any) {
  // El tenant ya viene en la URL
  const tenant = await this.prisma.tenant.findUnique({
    where: { codigo: codigoTenant },
    include: { integraciones: true }
  });

  if (!tenant || !tenant.integraciones?.whatsappActivo) {
    return; // Tenant no existe o WhatsApp no activo
  }

  // Extraer telefono del mensaje
  const telefono = body.entry[0].changes[0].value.messages[0].from;

  // Procesar con contexto del tenant
  await this.procesarMensaje(telefono, body, tenant.id);
}
```

**Ventaja:** Cada tenant tiene su propio numero de WhatsApp y webhook, no hay ambiguedad.

**Complejidad Total Backend:** MEDIA-ALTA | **Esfuerzo:** 65-90 horas

---

### 5. Frontend

#### Auth Store (Zustand)

```typescript
// store/auth.ts
interface AuthState {
  user: User | null;
  token: string | null;

  // NUEVO
  tenants: TenantResumen[];
  tenantActivo: TenantResumen | null;

  // NUEVO
  setTenantActivo: (tenant: TenantResumen) => void;
  switchTenant: (tenantId: number) => Promise<void>;
}

interface TenantResumen {
  id: number;
  nombre: string;
  codigo: string;
  rol: string;
}
```

#### API Interceptor

```typescript
// services/api.ts
api.interceptors.request.use((config) => {
  const { token, tenantActivo } = useAuthStore.getState();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // NUEVO: Agregar tenant a cada request
  if (tenantActivo) {
    config.headers['X-Tenant-Id'] = tenantActivo.id;
  }

  return config;
});
```

#### Selector de Tenant (Header)

```tsx
// components/layout/TenantSelector.tsx
export function TenantSelector() {
  const { tenants, tenantActivo, switchTenant } = useAuthStore();

  if (tenants.length <= 1) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost">
          <Building2 className="mr-2 h-4 w-4" />
          {tenantActivo?.nombre}
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {tenants.map((tenant) => (
          <DropdownMenuItem
            key={tenant.id}
            onClick={() => switchTenant(tenant.id)}
          >
            {tenant.nombre}
            {tenant.id === tenantActivo?.id && (
              <Check className="ml-auto h-4 w-4" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

#### WebSocket Namespace

```typescript
// services/socket.ts
export function connectSocket(tenantId: number) {
  return io(`${SOCKET_URL}/tenant-${tenantId}`, {
    auth: { token: useAuthStore.getState().token }
  });
}

// En componentes:
useEffect(() => {
  const socket = connectSocket(tenantActivo.id);
  socket.on('nuevo-mensaje', handleNuevoMensaje);

  return () => socket.disconnect();
}, [tenantActivo.id]); // Reconectar al cambiar tenant
```

**Complejidad:** MEDIA | **Esfuerzo:** 20-25 horas

---

### 6. Configuracion de Integraciones por Tenant

Cada tenant puede configurar sus propias credenciales de WhatsApp y OpenAI con webhook unico.

#### Arquitectura de Webhooks

```
                    Meta WhatsApp Cloud API
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
/webhook/whatsapp/     /webhook/whatsapp/    /webhook/whatsapp/
   centro-lima            norte               sur
        │                   │                   │
        ▼                   ▼                   ▼
   ┌─────────┐         ┌─────────┐        ┌─────────┐
   │Tenant 1 │         │Tenant 2 │        │Tenant 3 │
   │Centro   │         │Norte    │        │Sur      │
   └─────────┘         └─────────┘        └─────────┘
```

#### Nueva Tabla: Configuracion de Integraciones

```prisma
model TenantIntegraciones {
  id                    Int       @id @default(autoincrement())
  tenantId              Int       @unique

  // ===== WHATSAPP (equivalente a tu .env actual) =====
  // WHATSAPP_TOKEN
  whatsappAccessToken   String?   // Token de acceso (ENCRIPTADO)
  // WHATSAPP_PHONE_NUMBER_ID
  whatsappPhoneNumberId String?   // ID del numero de telefono
  // WHATSAPP_VERIFY_TOKEN (generado automaticamente)
  whatsappVerifyToken   String    @default(uuid())
  // WHATSAPP_BOT_NUMBER
  whatsappBotNumber     String?   // Numero del bot (ej: 51999888777)

  // Estado WhatsApp
  whatsappVerificado    Boolean   @default(false)
  whatsappActivo        Boolean   @default(false)

  // Plantillas WhatsApp
  templateRecordatorio  String?   @default("recordatorio_programa")

  // ===== OPENAI =====
  // OPENAI_API_KEY
  openaiApiKey          String?   // API Key de OpenAI (ENCRIPTADO)
  // Modelo a usar
  openaiModel           String    @default("gpt-4o-mini")
  // Activo
  openaiActivo          Boolean   @default(false)

  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  tenant                Tenant    @relation(fields: [tenantId], references: [id])

  @@map("tenant_integraciones")
}
```

**Mapeo con tu .env actual:**

| Variable .env | Campo en BD | Notas |
|---------------|-------------|-------|
| `WHATSAPP_TOKEN` | `whatsappAccessToken` | Encriptado |
| `WHATSAPP_PHONE_NUMBER_ID` | `whatsappPhoneNumberId` | |
| `WHATSAPP_VERIFY_TOKEN` | `whatsappVerifyToken` | Auto-generado |
| `WHATSAPP_BOT_NUMBER` | `whatsappBotNumber` | |
| `OPENAI_API_KEY` | `openaiApiKey` | Encriptado |

#### Webhook Controller por Tenant

```typescript
// whatsapp-bot/whatsapp-webhook.controller.ts

@Controller('webhook/whatsapp')
export class WhatsappWebhookController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsappService: WhatsappBotService,
  ) {}

  /**
   * Verificacion del webhook (GET)
   * URL: /webhook/whatsapp/:codigoTenant
   * Ejemplo: /webhook/whatsapp/centro-lima
   */
  @Get(':codigoTenant')
  async verifyWebhook(
    @Param('codigoTenant') codigoTenant: string,
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') verifyToken: string,
    @Query('hub.challenge') challenge: string,
  ) {
    // Buscar tenant por codigo
    const tenant = await this.prisma.tenant.findUnique({
      where: { codigo: codigoTenant },
      include: { integraciones: true },
    });

    if (!tenant || !tenant.integraciones) {
      throw new NotFoundException('Tenant no encontrado o sin configuracion');
    }

    // Verificar token (comparar con el generado en BD)
    if (mode === 'subscribe' && verifyToken === tenant.integraciones.whatsappVerifyToken) {
      // Marcar como verificado
      await this.prisma.tenantIntegraciones.update({
        where: { tenantId: tenant.id },
        data: { whatsappVerificado: true },
      });

      return challenge; // Meta espera el challenge como respuesta
    }

    throw new ForbiddenException('Token de verificacion invalido');
  }

  /**
   * Recibir mensajes (POST)
   */
  @Post(':codigoTenant')
  async handleWebhook(
    @Param('codigoTenant') codigoTenant: string,
    @Body() body: any,
  ) {
    // Buscar tenant
    const tenant = await this.prisma.tenant.findUnique({
      where: { codigo: codigoTenant },
      include: { integraciones: true },
    });

    if (!tenant || !tenant.integraciones?.whatsappActivo) {
      throw new NotFoundException('Webhook no configurado o inactivo');
    }

    // Procesar mensaje con contexto del tenant
    await this.whatsappService.processWebhook(body, tenant.id);

    return { status: 'ok' };
  }
}
```

#### Servicio de Encriptacion

```typescript
// common/crypto.service.ts

import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class CryptoService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;

  constructor() {
    // Clave de encriptacion desde variable de entorno
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey || encryptionKey.length !== 64) {
      throw new Error('ENCRYPTION_KEY debe ser una cadena hex de 64 caracteres (32 bytes)');
    }
    this.key = Buffer.from(encryptionKey, 'hex');
  }

  encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Formato: iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  decrypt(encryptedText: string): string {
    const [ivHex, authTagHex, encrypted] = encryptedText.split(':');

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}
```

#### API de Configuracion de Integraciones

```typescript
// tenant/tenant-integraciones.controller.ts

@Controller('tenant/integraciones')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Roles('admin', 'owner')
export class TenantIntegracionesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cryptoService: CryptoService,
  ) {}

  /**
   * Obtener configuracion actual (tokens ocultos)
   */
  @Get()
  async getConfig(@TenantId() tenantId: number) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { integraciones: true },
    });

    const config = tenant?.integraciones;

    return {
      // WhatsApp
      whatsapp: {
        configured: !!config?.whatsappAccessToken,
        phoneNumberId: config?.whatsappPhoneNumberId,
        botNumber: config?.whatsappBotNumber,
        accessToken: config?.whatsappAccessToken ? '••••••••' : null,
        webhookUrl: `${process.env.API_URL}/webhook/whatsapp/${tenant?.codigo}`,
        verifyToken: config?.whatsappVerifyToken,
        verificado: config?.whatsappVerificado || false,
        activo: config?.whatsappActivo || false,
        templateRecordatorio: config?.templateRecordatorio,
      },
      // OpenAI
      openai: {
        configured: !!config?.openaiApiKey,
        apiKey: config?.openaiApiKey ? '••••••••' : null,
        model: config?.openaiModel || 'gpt-4o-mini',
        activo: config?.openaiActivo || false,
      },
    };
  }

  /**
   * Guardar configuracion de WhatsApp
   */
  @Post('whatsapp')
  async saveWhatsapp(
    @TenantId() tenantId: number,
    @Body() dto: SaveWhatsappDto,
  ) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    // Encriptar token si se proporciona
    const accessTokenEncrypted = dto.accessToken
      ? this.cryptoService.encrypt(dto.accessToken)
      : undefined;

    await this.prisma.tenantIntegraciones.upsert({
      where: { tenantId },
      update: {
        whatsappPhoneNumberId: dto.phoneNumberId,
        whatsappBotNumber: dto.botNumber,
        ...(accessTokenEncrypted && { whatsappAccessToken: accessTokenEncrypted }),
        templateRecordatorio: dto.templateRecordatorio,
        // Al cambiar token, resetear verificacion
        ...(dto.accessToken && { whatsappVerificado: false }),
      },
      create: {
        tenantId,
        whatsappPhoneNumberId: dto.phoneNumberId,
        whatsappBotNumber: dto.botNumber,
        whatsappAccessToken: accessTokenEncrypted,
        templateRecordatorio: dto.templateRecordatorio,
      },
    });

    const config = await this.prisma.tenantIntegraciones.findUnique({
      where: { tenantId },
    });

    return {
      success: true,
      webhookUrl: `${process.env.API_URL}/webhook/whatsapp/${tenant?.codigo}`,
      verifyToken: config?.whatsappVerifyToken,
      message: 'Configuracion guardada. Configura el webhook en Meta Business Suite.',
    };
  }

  /**
   * Guardar configuracion de OpenAI
   */
  @Post('openai')
  async saveOpenai(
    @TenantId() tenantId: number,
    @Body() dto: SaveOpenaiDto,
  ) {
    // Encriptar API key si se proporciona
    const apiKeyEncrypted = dto.apiKey
      ? this.cryptoService.encrypt(dto.apiKey)
      : undefined;

    await this.prisma.tenantIntegraciones.upsert({
      where: { tenantId },
      update: {
        ...(apiKeyEncrypted && { openaiApiKey: apiKeyEncrypted }),
        openaiModel: dto.model,
      },
      create: {
        tenantId,
        openaiApiKey: apiKeyEncrypted,
        openaiModel: dto.model || 'gpt-4o-mini',
      },
    });

    return { success: true };
  }

  /**
   * Probar conexion con WhatsApp
   */
  @Post('whatsapp/test')
  async testWhatsapp(@TenantId() tenantId: number) {
    const config = await this.prisma.tenantIntegraciones.findUnique({
      where: { tenantId },
    });

    if (!config?.whatsappAccessToken) {
      return { success: false, error: 'Token no configurado' };
    }

    try {
      const accessToken = this.cryptoService.decrypt(config.whatsappAccessToken);
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${config.whatsappPhoneNumberId}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (!response.ok) {
        const error = await response.json();
        return { success: false, error: error.error?.message || 'Error' };
      }

      const data = await response.json();
      return {
        success: true,
        phoneNumber: data.display_phone_number,
        verifiedName: data.verified_name,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Probar conexion con OpenAI
   */
  @Post('openai/test')
  async testOpenai(@TenantId() tenantId: number) {
    const config = await this.prisma.tenantIntegraciones.findUnique({
      where: { tenantId },
    });

    if (!config?.openaiApiKey) {
      return { success: false, error: 'API Key no configurada' };
    }

    try {
      const apiKey = this.cryptoService.decrypt(config.openaiApiKey);
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      if (!response.ok) {
        return { success: false, error: 'API Key invalida' };
      }

      return { success: true, model: config.openaiModel };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Activar/desactivar integracion
   */
  @Post(':integracion/toggle')
  async toggle(
    @TenantId() tenantId: number,
    @Param('integracion') integracion: 'whatsapp' | 'openai',
    @Body('activo') activo: boolean,
  ) {
    const config = await this.prisma.tenantIntegraciones.findUnique({
      where: { tenantId },
    });

    if (integracion === 'whatsapp') {
      if (activo && !config?.whatsappVerificado) {
        throw new BadRequestException('El webhook debe estar verificado primero');
      }
      await this.prisma.tenantIntegraciones.update({
        where: { tenantId },
        data: { whatsappActivo: activo },
      });
    } else if (integracion === 'openai') {
      if (activo && !config?.openaiApiKey) {
        throw new BadRequestException('Configura la API Key primero');
      }
      await this.prisma.tenantIntegraciones.update({
        where: { tenantId },
        data: { openaiActivo: activo },
      });
    }

    return { activo };
  }
}

// DTOs
class SaveWhatsappDto {
  @IsString() @IsOptional() phoneNumberId?: string;
  @IsString() @IsOptional() botNumber?: string;
  @IsString() @IsOptional() accessToken?: string;
  @IsString() @IsOptional() templateRecordatorio?: string;
}

class SaveOpenaiDto {
  @IsString() @IsOptional() apiKey?: string;
  @IsString() @IsOptional() model?: string;
}
```

#### Frontend: Pagina de Integraciones

```tsx
// pages/configuracion/IntegracionesPage.tsx

export function IntegracionesPage() {
  const [config, setConfig] = useState<IntegracionesConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadConfig(); }, []);

  const loadConfig = async () => {
    const response = await api.get('/tenant/integraciones');
    setConfig(response.data);
    setLoading(false);
  };

  if (loading) return <Spinner />;

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Integraciones</h1>

      {/* ===== WHATSAPP ===== */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-green-500" />
              WhatsApp Business
            </CardTitle>
            <div className="flex gap-2">
              <Badge variant={config?.whatsapp.activo ? 'success' : 'secondary'}>
                {config?.whatsapp.activo ? 'Activo' : 'Inactivo'}
              </Badge>
              <Badge variant={config?.whatsapp.verificado ? 'success' : 'warning'}>
                {config?.whatsapp.verificado ? 'Verificado' : 'Pendiente'}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Credenciales */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Phone Number ID</Label>
              <Input name="phoneNumberId" placeholder="123456789012345" />
            </div>
            <div>
              <Label>Numero del Bot</Label>
              <Input name="botNumber" placeholder="51999888777" />
            </div>
          </div>
          <div>
            <Label>Access Token</Label>
            <Input type="password" name="accessToken" placeholder="EAAxxxxxxx..." />
          </div>

          {/* Webhook (solo lectura) */}
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <p className="text-sm font-medium">Configura en Meta Business Suite:</p>
            <div className="flex gap-2">
              <Input value={config?.whatsapp.webhookUrl} readOnly className="font-mono text-xs" />
              <Button variant="outline" size="sm" onClick={() => copy(config?.whatsapp.webhookUrl)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-2">
              <Input value={config?.whatsapp.verifyToken} readOnly className="font-mono text-xs" />
              <Button variant="outline" size="sm" onClick={() => copy(config?.whatsapp.verifyToken)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={saveWhatsapp}>Guardar</Button>
            <Button variant="outline" onClick={testWhatsapp}>Probar</Button>
            {config?.whatsapp.verificado && (
              <Switch checked={config?.whatsapp.activo} onCheckedChange={toggleWhatsapp} />
            )}
          </div>
        </CardContent>
      </Card>

      {/* ===== OPENAI ===== */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              OpenAI (Bot IA)
            </CardTitle>
            <Badge variant={config?.openai.activo ? 'success' : 'secondary'}>
              {config?.openai.activo ? 'Activo' : 'Inactivo'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>API Key</Label>
            <Input type="password" name="openaiApiKey" placeholder="sk-..." />
          </div>
          <div>
            <Label>Modelo</Label>
            <Select name="openaiModel" defaultValue={config?.openai.model}>
              <SelectItem value="gpt-4o-mini">GPT-4o Mini (Rapido, economico)</SelectItem>
              <SelectItem value="gpt-4o">GPT-4o (Mas inteligente)</SelectItem>
              <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button onClick={saveOpenai}>Guardar</Button>
            <Button variant="outline" onClick={testOpenai}>Probar</Button>
            {config?.openai.configured && (
              <Switch checked={config?.openai.activo} onCheckedChange={toggleOpenai} />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

#### Variables de Entorno Nuevas

```env
# .env

# Clave de encriptacion para credenciales sensibles (32 bytes en hex = 64 caracteres)
# Generar con: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_KEY=a1b2c3d4e5f6...64caracteres...

# URL base de la API (para generar URLs de webhook)
API_URL=https://api.tudominio.com
```

#### Flujo de Configuracion para Admin del Tenant

```
=== WHATSAPP ===

1. Admin accede a Configuracion → Integraciones

2. Ingresa credenciales de Meta:
   - Phone Number ID (WHATSAPP_PHONE_NUMBER_ID)
   - Access Token (WHATSAPP_TOKEN)
   - Numero del Bot (WHATSAPP_BOT_NUMBER)

3. Sistema guarda credenciales (encriptadas) y genera:
   - URL de webhook unica: https://api.tudominio.com/webhook/whatsapp/mi-tenant
   - Token de verificacion (WHATSAPP_VERIFY_TOKEN)

4. Admin copia URL y token a Meta Business Suite

5. Meta verifica el webhook

6. Admin activa el bot


=== OPENAI ===

1. Admin ingresa su API Key de OpenAI

2. Selecciona el modelo (gpt-4o-mini recomendado)

3. Prueba la conexion

4. Activa la IA para el bot
```

**Complejidad:** MEDIA-ALTA | **Esfuerzo adicional:** 15-20 horas

---

## Plan de Implementacion

### Fase 1: Fundamentos (Semana 1)
- [ ] Crear tabla `Tenant` y `TenantIntegraciones`
- [ ] Crear tabla `UsuarioTenant`
- [ ] Crear migracion Prisma
- [ ] Script de migracion de datos (asignar tenant default)

### Fase 2: Autenticacion (Semana 2)
- [ ] Extender JWT payload con tenant
- [ ] Crear TenantMiddleware
- [ ] Endpoint switch-tenant
- [ ] Actualizar RolesGuard

### Fase 3: Modulos Core (Semana 3)
- [ ] Actualizar ProgramasService
- [ ] Actualizar AsistenciaService
- [ ] Actualizar UsuariosService
- [ ] Actualizar TiposAsistenciaService

### Fase 4: Integraciones Multi-Tenant (Semana 4)
- [ ] Crear tabla `TenantIntegraciones`
- [ ] Implementar `CryptoService` para encriptacion
- [ ] Crear webhook controller por tenant (`/webhook/whatsapp/:codigo`)
- [ ] API de configuracion (WhatsApp + OpenAI)
- [ ] Frontend: Pagina de Integraciones

### Fase 5: WhatsApp Bot e Inbox (Semana 5)
- [ ] Actualizar WhatsappBotService (usar credenciales por tenant)
- [ ] Actualizar OpenAIService (usar API key por tenant)
- [ ] Actualizar InboxService (conversaciones por tenant)
- [ ] Actualizar WebSocket gateways

### Fase 6: Frontend (Semana 6)
- [ ] Extender Auth Store
- [ ] Crear TenantSelector
- [ ] Actualizar API interceptor
- [ ] Actualizar conexiones WebSocket

### Fase 7: Testing y Deploy (Semana 7)
- [ ] Tests unitarios
- [ ] Tests e2e
- [ ] Migracion de produccion
- [ ] Monitoreo

---

## Estimacion de Esfuerzo

| Area | Complejidad | Horas |
|------|-------------|-------|
| Base de datos (schema + migraciones) | MEDIA-ALTA | 20-30 |
| **Super Admin (panel global)** | **MEDIA** | **10-15** |
| Autenticacion | MEDIA | 15-20 |
| Usuarios | MEDIA | 15-20 |
| Programas | MEDIA | 10-15 |
| Asistencia | MEDIA | 15-20 |
| WhatsApp Bot (routing) | ALTA | 25-35 |
| Integraciones (WhatsApp + OpenAI) | MEDIA-ALTA | 15-20 |
| Inbox | MEDIA | 15-20 |
| Frontend | MEDIA | 20-25 |
| Testing | MEDIA | 15-20 |
| Deploy + Migracion | BAJA | 5-10 |
| **TOTAL** | | **180-265** |

**Tiempo estimado:** 5-7 semanas (1 desarrollador full-time)

---

## Puntos Criticos

### 1. Migracion de Datos Existentes
```sql
-- Crear tenant default
INSERT INTO tenants (nombre, codigo) VALUES ('Mi Organizacion', 'default');

-- Asignar todos los usuarios al tenant default
INSERT INTO usuarios_tenants (usuario_id, tenant_id, rol)
SELECT id, 1, 'participante' FROM usuarios;

-- Asignar admin al primer usuario admin
UPDATE usuarios_tenants SET rol = 'admin'
WHERE usuario_id IN (SELECT usuario_id FROM usuarios_roles WHERE rol_id = 1);

-- Actualizar programas existentes
UPDATE programas SET tenant_id = 1;
```

### 2. WhatsApp Multi-Tenant
- **Solucion:** Cada tenant tiene su propio webhook y numero de WhatsApp
- No hay ambiguedad sobre a cual tenant pertenece el mensaje

### 3. Performance
- Agregar indices compuestos: `(tenant_id, campo_original)`
- Cache Redis por tenant: `tenant:1:programas:proximos`

### 4. Seguridad
- **SIEMPRE** validar que el recurso pertenece al tenant del usuario
- Usar decorador `@ValidateTenant()` en todos los endpoints

### 5. Planes y Limites
```typescript
// Verificar limites antes de crear recursos
async crearPrograma(tenantId: number, dto: CreateProgramaDto) {
  const tenant = await this.prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { _count: { select: { programas: true } } }
  });

  if (tenant._count.programas >= tenant.limiteProgramas) {
    throw new ForbiddenException('Has alcanzado el limite de programas de tu plan');
  }

  // ... crear programa
}
```

---

## Conclusiones

La conversion a SaaS multi-tenant es factible con la arquitectura actual. Los cambios principales son:

1. **Agregar `tenantId`** a todas las entidades de datos
2. **Extender autenticacion** para manejar multiples tenants
3. **Filtrar queries** en todos los servicios
4. **Actualizar frontend** con selector de tenant
5. **Webhook unico por tenant** para WhatsApp (`/webhook/whatsapp/:codigo`)
6. **Panel de Integraciones** para que cada tenant configure WhatsApp + OpenAI

### Flujo de WhatsApp Multi-Tenant

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ADMIN DEL TENANT                              │
│  1. Accede a Configuracion → Integraciones                          │
│  2. Configura WhatsApp: Phone Number ID, Access Token               │
│  3. Configura OpenAI: API Key, Modelo                               │
│  4. Copia URL webhook y verify token a Meta Business Suite          │
│  5. Meta verifica el webhook                                         │
│  6. Admin activa el bot                                              │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      USUARIO ENVIA MENSAJE                           │
│  1. Usuario envia WhatsApp al numero del tenant                     │
│  2. Meta envia POST a /webhook/whatsapp/mi-tenant                   │
│  3. Sistema identifica tenant por codigo en URL                     │
│  4. Desencripta credenciales de WhatsApp y OpenAI                   │
│  5. Procesa mensaje con contexto del tenant                         │
│  6. Responde usando las credenciales de ese tenant                  │
└─────────────────────────────────────────────────────────────────────┘
```

**Recomendacion:** Implementar en fases, empezando con un tenant piloto antes de lanzar a produccion general.
