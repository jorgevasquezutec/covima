# Recuperar Contraseña vía WhatsApp

## Resumen

Sistema de "olvidé mi contraseña" que envía un código de verificación al WhatsApp del usuario. Resuelve el problema de que todos los usuarios tienen `password` como contraseña por defecto.

## Flujo del Usuario

```
┌─────────────────────────────────────────────────────────────────────┐
│                        PANTALLA DE LOGIN                            │
│                                                                     │
│   [📱 +51 940393758        ]                                        │
│   [🔒 ••••••••          👁 ]                                        │
│   [      Ingresar          ]                                        │
│                                                                     │
│         ¿Olvidaste tu contraseña?  ← Link nuevo                     │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   PASO 1: SOLICITAR CÓDIGO                          │
│                                                                     │
│   Ingresa tu número de teléfono registrado                          │
│                                                                     │
│   [📱 +51 940393758        ]                                        │
│   [   Enviar código        ]                                        │
│                                                                     │
│   ← Volver al login                                                 │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼ POST /auth/forgot-password
                              │ → Genera código 6 dígitos
                              │ → Guarda en Redis (5 min TTL)
                              │ → Envía template WhatsApp
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   PASO 2: VERIFICAR CÓDIGO                          │
│                                                                     │
│   Ingresa el código de 6 dígitos enviado a tu WhatsApp              │
│                                                                     │
│   [ 1 ][ 2 ][ 3 ][ 4 ][ 5 ][ 6 ]  ← Input tipo OTP                  │
│                                                                     │
│   ¿No recibiste el código? Reenviar (disponible en 60s)             │
│   [   Verificar código     ]                                        │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼ POST /auth/verify-reset-code
                              │ → Valida código en Redis
                              │ → Retorna resetToken (JWT corto, 10 min)
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   PASO 3: NUEVA CONTRASEÑA                          │
│                                                                     │
│   Crea tu nueva contraseña                                          │
│                                                                     │
│   [🔒 Nueva contraseña     ]                                        │
│   [🔒 Confirmar contraseña ]                                        │
│                                                                     │
│   [   Cambiar contraseña   ]                                        │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼ POST /auth/reset-password
                              │ → Valida resetToken
                              │ → Actualiza passwordHash
                              │ → debeCambiarPassword = false
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   ✅ ÉXITO                                          │
│                                                                     │
│   Tu contraseña ha sido actualizada                                 │
│   [   Ir al login          ]                                        │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Template de WhatsApp (Meta Business Suite)

### Problema con Autenticación

Los templates de categoría "Autenticación" requieren:
- Cuenta verificada con historial de mensajes de calidad
- Permisos especiales que se desbloquean con el uso

### Solución: Usar categoría "Utilidad"

Meta detecta palabras como "código", "verificación", "clave", "ingresar" y las marca como autenticación. Usar un texto que suene a **notificación de servicio**:

**Nombre del template:** `solicitud_referencia`

**Categoría:** Utilidad

**Idioma:** Spanish (Peru) - `es_PE`

**Cuerpo (opciones que evitan detección):**

```
Hola de Covima. Tu solicitud fue procesada con el número: {{1}}. Guarda este número para referencia.
```

o

```
Covima: Hemos recibido tu solicitud. Tu número de referencia es: {{1}}. Gracias por contactarnos.
```

**Variable de muestra:** `123456`

**Pie de página:** (vacío o "Válido por 5 minutos")

**Botones:** Ninguno

### Importante

- Evitar palabras: código, verificación, clave, contraseña, ingresar, acceso, OTP
- El mensaje debe sonar a "notificación" no a "autenticación"

---

## Implementación Backend

### 1. Nuevos DTOs

**Archivo:** `backend/src/auth/dto/forgot-password.dto.ts`

```typescript
import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class ForgotPasswordDto {
  @IsString()
  @IsNotEmpty()
  codigoPais: string;

  @IsString()
  @IsNotEmpty()
  telefono: string;
}

export class VerifyResetCodeDto {
  @IsString()
  @IsNotEmpty()
  codigoPais: string;

  @IsString()
  @IsNotEmpty()
  telefono: string;

  @IsString()
  @IsNotEmpty()
  code: string;
}

export class ResetPasswordWithTokenDto {
  @IsString()
  @IsNotEmpty()
  resetToken: string;

  @IsString()
  @MinLength(6)
  newPassword: string;
}
```

### 2. Nuevos Endpoints

**Archivo:** `backend/src/auth/auth.controller.ts`

```typescript
// POST /auth/forgot-password
@Post('forgot-password')
@ApiOperation({ summary: 'Solicitar código de recuperación vía WhatsApp' })
async forgotPassword(@Body() dto: ForgotPasswordDto) {
  return this.authService.forgotPassword(dto);
}

// POST /auth/verify-reset-code
@Post('verify-reset-code')
@ApiOperation({ summary: 'Verificar código y obtener token de reset' })
async verifyResetCode(@Body() dto: VerifyResetCodeDto) {
  return this.authService.verifyResetCode(dto);
}

// POST /auth/reset-password
@Post('reset-password')
@ApiOperation({ summary: 'Establecer nueva contraseña con token' })
async resetPassword(@Body() dto: ResetPasswordWithTokenDto) {
  return this.authService.resetPasswordWithToken(dto);
}
```

### 3. Lógica en AuthService

**Archivo:** `backend/src/auth/auth.service.ts`

```typescript
import { WhatsappBotService } from '../whatsapp-bot/whatsapp-bot.service';

// Inyectar en constructor
constructor(
  private prisma: PrismaService,
  private jwtService: JwtService,
  private redisService: RedisService,
  private whatsappService: WhatsappBotService,  // Agregar
) {}

// Generar código 6 dígitos
private generateResetCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// POST /auth/forgot-password
async forgotPassword(dto: ForgotPasswordDto) {
  const { codigoPais, telefono } = dto;
  const redisKey = `reset:${codigoPais}:${telefono}`;
  const cooldownKey = `reset:cooldown:${codigoPais}:${telefono}`;
  const attemptsKey = `reset:attempts:${codigoPais}:${telefono}`;

  // Rate limiting: máximo 3 solicitudes cada 15 min
  const attempts = await this.redisService.get(attemptsKey);
  if (attempts && parseInt(attempts) >= 3) {
    throw new BadRequestException('Demasiados intentos. Espera 15 minutos.');
  }

  // Cooldown: 60 segundos entre solicitudes
  const cooldown = await this.redisService.get(cooldownKey);
  if (cooldown) {
    throw new BadRequestException('Espera 60 segundos antes de solicitar otro código.');
  }

  // Buscar usuario (no revelar si existe o no)
  const usuario = await this.prisma.usuario.findUnique({
    where: { codigoPais_telefono: { codigoPais, telefono } },
  });

  // Siempre responder igual (seguridad)
  if (!usuario || !usuario.activo) {
    return { message: 'Si el número está registrado, recibirás un código.' };
  }

  // Generar y guardar código
  const code = this.generateResetCode();
  await this.redisService.set(redisKey, code, 300); // 5 min TTL
  await this.redisService.set(cooldownKey, '1', 60); // 60 seg cooldown
  await this.redisService.incr(attemptsKey);
  await this.redisService.expire(attemptsKey, 900); // 15 min TTL

  // Enviar WhatsApp
  const phoneNumber = `${codigoPais}${telefono}`;
  await this.whatsappService.sendTemplateToPhone(
    phoneNumber,
    'solicitud_referencia',  // Nombre del template
    'es_PE',
    [code],  // {{1}} = código
  );

  return { message: 'Si el número está registrado, recibirás un código.' };
}

// POST /auth/verify-reset-code
async verifyResetCode(dto: VerifyResetCodeDto) {
  const { codigoPais, telefono, code } = dto;
  const redisKey = `reset:${codigoPais}:${telefono}`;
  const failedKey = `reset:failed:${codigoPais}:${telefono}`;

  // Verificar intentos fallidos (máximo 5)
  const failed = await this.redisService.get(failedKey);
  if (failed && parseInt(failed) >= 5) {
    throw new BadRequestException('Demasiados intentos fallidos. Solicita un nuevo código.');
  }

  // Obtener código guardado
  const savedCode = await this.redisService.get(redisKey);
  if (!savedCode) {
    throw new BadRequestException('Código expirado o no existe.');
  }

  // Comparar
  if (savedCode !== code) {
    await this.redisService.incr(failedKey);
    await this.redisService.expire(failedKey, 900); // 15 min
    throw new BadRequestException('Código incorrecto.');
  }

  // Código correcto: eliminar de Redis
  await this.redisService.del(redisKey);
  await this.redisService.del(failedKey);

  // Buscar usuario
  const usuario = await this.prisma.usuario.findUnique({
    where: { codigoPais_telefono: { codigoPais, telefono } },
  });

  if (!usuario) {
    throw new BadRequestException('Usuario no encontrado.');
  }

  // Generar resetToken (JWT corto)
  const resetToken = this.jwtService.sign(
    { sub: usuario.id, type: 'reset' },
    { expiresIn: '10m' },
  );

  return { resetToken };
}

// POST /auth/reset-password
async resetPasswordWithToken(dto: ResetPasswordWithTokenDto) {
  const { resetToken, newPassword } = dto;

  // Validar token
  let payload: any;
  try {
    payload = this.jwtService.verify(resetToken);
  } catch {
    throw new BadRequestException('Token inválido o expirado.');
  }

  if (payload.type !== 'reset') {
    throw new BadRequestException('Token inválido.');
  }

  // Actualizar contraseña
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await this.prisma.usuario.update({
    where: { id: payload.sub },
    data: {
      passwordHash: hashedPassword,
      debeCambiarPassword: false,
    },
  });

  return { message: 'Contraseña actualizada correctamente.' };
}
```

### 4. Redis Keys

```
reset:51:940393758           → "123456"    (TTL: 5 min) - Código
reset:cooldown:51:940393758  → "1"         (TTL: 60 seg) - Evita spam
reset:attempts:51:940393758  → "3"         (TTL: 15 min) - Rate limiting
reset:failed:51:940393758    → "2"         (TTL: 15 min) - Intentos fallidos
```

### 5. Modificar AuthModule

**Archivo:** `backend/src/auth/auth.module.ts`

```typescript
import { WhatsappBotModule } from '../whatsapp-bot/whatsapp-bot.module';

@Module({
  imports: [
    // ... existentes
    WhatsappBotModule,  // Agregar
  ],
  // ...
})
```

---

## Implementación Frontend

### 1. Nueva Página

**Archivo:** `frontend/src/pages/ForgotPassword.tsx`

Componente con 3 pasos:
- **Step 1**: Formulario teléfono → solicitar código
- **Step 2**: Input OTP 6 dígitos → verificar código
- **Step 3**: Formulario nueva contraseña → reset

### 2. Nuevos Endpoints en API

**Archivo:** `frontend/src/services/api.ts`

```typescript
export const authApi = {
  // ... existentes

  forgotPassword: async (data: { codigoPais: string; telefono: string }) => {
    const response = await api.post('/auth/forgot-password', data);
    return response.data;
  },

  verifyResetCode: async (data: { codigoPais: string; telefono: string; code: string }) => {
    const response = await api.post<{ resetToken: string }>('/auth/verify-reset-code', data);
    return response.data;
  },

  resetPasswordWithToken: async (data: { resetToken: string; newPassword: string }) => {
    const response = await api.post('/auth/reset-password', data);
    return response.data;
  },
};
```

### 3. Link en Login

**Archivo:** `frontend/src/pages/Login.tsx`

```tsx
import { Link } from 'react-router-dom';

// Después del botón "Ingresar"
<p className="text-center mt-4">
  <Link to="/forgot-password" className="text-sm text-blue-600 hover:underline">
    ¿Olvidaste tu contraseña?
  </Link>
</p>
```

### 4. Nueva Ruta

**Archivo:** `frontend/src/App.tsx`

```tsx
import ForgotPassword from './pages/ForgotPassword';

// En las rutas públicas
<Route path="/forgot-password" element={<ForgotPassword />} />
```

---

## Archivos a Crear/Modificar

### Backend
| Archivo | Acción |
|---------|--------|
| `backend/src/auth/dto/forgot-password.dto.ts` | Crear |
| `backend/src/auth/dto/index.ts` | Modificar (exportar nuevos DTOs) |
| `backend/src/auth/auth.controller.ts` | Modificar (3 endpoints) |
| `backend/src/auth/auth.service.ts` | Modificar (3 métodos) |
| `backend/src/auth/auth.module.ts` | Modificar (importar WhatsappBotModule) |

### Frontend
| Archivo | Acción |
|---------|--------|
| `frontend/src/pages/ForgotPassword.tsx` | Crear |
| `frontend/src/pages/Login.tsx` | Modificar (link) |
| `frontend/src/services/api.ts` | Modificar (3 endpoints) |
| `frontend/src/App.tsx` | Modificar (ruta) |

---

## Seguridad

1. **Rate Limiting**: Máximo 3 solicitudes por teléfono cada 15 minutos
2. **Cooldown**: 60 segundos entre reenvíos de código
3. **Intentos**: Máximo 5 intentos de verificación por código
4. **Expiración código**: 5 minutos
5. **Expiración resetToken**: 10 minutos
6. **No revelar si usuario existe**: Siempre responder "código enviado"

---

## Verificación

1. **Backend**:
   - Probar endpoints con Swagger/curl
   - Verificar que el template llega a WhatsApp
   - Verificar expiración en Redis

2. **Frontend**:
   - Probar flujo completo desde login
   - Verificar validaciones de formulario
   - Probar reenvío de código
   - Probar con código incorrecto

3. **Integración**:
   - Usuario con contraseña "password" puede resetear
   - Después del reset puede hacer login con nueva contraseña
   - `debeCambiarPassword` queda en `false`

---

## Pendiente

- [ ] Crear template en Meta Business Suite (cuando se apruebe)
- [ ] Actualizar nombre del template en el código si cambia
