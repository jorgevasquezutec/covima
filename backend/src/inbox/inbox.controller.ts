import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { InboxService } from './inbox.service';
import {
  GetConversacionesDto,
  GetMensajesDto,
  EnviarMensajeDto,
  TransferirConversacionDto,
  CerrarHandoffDto,
  MarcarLeidoDto,
} from './dto';

@ApiTags('Inbox')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'lider')
@Controller('inbox')
export class InboxController {
  constructor(private readonly inboxService: InboxService) {}

  // ==================== CONVERSACIONES ====================

  @Get('conversaciones')
  @ApiOperation({
    summary: 'Listar conversaciones con paginación cursor-based',
  })
  @ApiResponse({ status: 200, description: 'Lista de conversaciones' })
  async getConversaciones(
    @Query() dto: GetConversacionesDto,
    @Request() req: any,
  ) {
    return this.inboxService.getConversaciones(dto, req.user.id);
  }

  @Get('conversaciones/:id')
  @ApiOperation({ summary: 'Obtener detalle de una conversación' })
  @ApiParam({ name: 'id', description: 'ID de la conversación' })
  @ApiResponse({ status: 200, description: 'Detalle de la conversación' })
  @ApiResponse({ status: 404, description: 'Conversación no encontrada' })
  async getConversacion(@Param('id', ParseIntPipe) id: number) {
    return this.inboxService.getConversacion(id);
  }

  // ==================== MENSAJES ====================

  @Get('conversaciones/:id/mensajes')
  @ApiOperation({
    summary: 'Obtener mensajes de una conversación con paginación',
  })
  @ApiParam({ name: 'id', description: 'ID de la conversación' })
  @ApiResponse({ status: 200, description: 'Lista de mensajes' })
  @ApiResponse({ status: 404, description: 'Conversación no encontrada' })
  async getMensajes(
    @Param('id', ParseIntPipe) id: number,
    @Query() dto: GetMensajesDto,
  ) {
    return this.inboxService.getMensajes(id, dto);
  }

  @Post('conversaciones/:id/mensajes')
  @ApiOperation({ summary: 'Enviar mensaje como admin' })
  @ApiParam({ name: 'id', description: 'ID de la conversación' })
  @ApiResponse({ status: 201, description: 'Mensaje enviado' })
  @ApiResponse({
    status: 400,
    description: 'La conversación no está en modo HANDOFF',
  })
  @ApiResponse({
    status: 403,
    description: 'No tienes permisos para enviar mensajes en esta conversación',
  })
  @ApiResponse({ status: 404, description: 'Conversación no encontrada' })
  async enviarMensaje(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EnviarMensajeDto,
    @Request() req: any,
  ) {
    return this.inboxService.enviarMensaje(id, dto, req.user.id);
  }

  // ==================== HANDOFF ====================

  @Post('conversaciones/:id/tomar')
  @ApiOperation({ summary: 'Tomar una conversación (iniciar handoff)' })
  @ApiParam({ name: 'id', description: 'ID de la conversación' })
  @ApiResponse({ status: 200, description: 'Conversación tomada exitosamente' })
  @ApiResponse({
    status: 400,
    description: 'La conversación ya está siendo atendida',
  })
  @ApiResponse({ status: 404, description: 'Conversación no encontrada' })
  async tomarConversacion(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ) {
    return this.inboxService.tomarConversacion(id, req.user.id);
  }

  @Post('conversaciones/:id/cerrar')
  @ApiOperation({ summary: 'Cerrar handoff y devolver conversación al bot' })
  @ApiParam({ name: 'id', description: 'ID de la conversación' })
  @ApiResponse({ status: 200, description: 'Handoff cerrado exitosamente' })
  @ApiResponse({
    status: 400,
    description: 'La conversación no está en modo HANDOFF',
  })
  @ApiResponse({
    status: 403,
    description: 'Solo el admin asignado puede cerrar',
  })
  @ApiResponse({ status: 404, description: 'Conversación no encontrada' })
  async cerrarHandoff(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CerrarHandoffDto,
    @Request() req: any,
  ) {
    return this.inboxService.cerrarHandoff(id, req.user.id, dto);
  }

  @Post('conversaciones/:id/transferir')
  @ApiOperation({ summary: 'Transferir conversación a otro admin' })
  @ApiParam({ name: 'id', description: 'ID de la conversación' })
  @ApiResponse({
    status: 200,
    description: 'Conversación transferida exitosamente',
  })
  @ApiResponse({
    status: 400,
    description:
      'La conversación no está en modo HANDOFF o admin destino inválido',
  })
  @ApiResponse({
    status: 403,
    description: 'Solo el admin asignado puede transferir',
  })
  @ApiResponse({
    status: 404,
    description: 'Conversación o admin no encontrado',
  })
  async transferirConversacion(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: TransferirConversacionDto,
    @Request() req: any,
  ) {
    return this.inboxService.transferirConversacion(id, req.user.id, dto);
  }

  // ==================== ACCIONES ====================

  @Post('conversaciones/:id/leer')
  @ApiOperation({ summary: 'Marcar mensajes como leídos' })
  @ApiParam({ name: 'id', description: 'ID de la conversación' })
  @ApiResponse({ status: 200, description: 'Mensajes marcados como leídos' })
  @ApiResponse({ status: 404, description: 'Conversación no encontrada' })
  async marcarComoLeido(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: MarcarLeidoDto,
    @Request() req: any,
  ) {
    return this.inboxService.marcarComoLeido(id, req.user.id, dto);
  }

  @Post('conversaciones/:id/modo-respuesta')
  @ApiOperation({ summary: 'Cambiar modo de respuesta para esta conversación' })
  @ApiParam({ name: 'id', description: 'ID de la conversación' })
  @ApiResponse({ status: 200, description: 'Modo de respuesta actualizado' })
  @ApiResponse({
    status: 403,
    description: 'Solo el admin asignado puede cambiar el modo',
  })
  @ApiResponse({ status: 404, description: 'Conversación no encontrada' })
  async actualizarModoRespuesta(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: { modoRespuesta: 'WEB' | 'WHATSAPP' | 'AMBOS' | null },
    @Request() req: any,
  ) {
    return this.inboxService.actualizarModoRespuesta(
      id,
      req.user.id,
      dto.modoRespuesta,
    );
  }

  // ==================== UTILIDADES ====================

  @Get('admins-disponibles')
  @ApiOperation({
    summary: 'Obtener lista de admins disponibles para transferencia',
  })
  @ApiResponse({ status: 200, description: 'Lista de admins' })
  async getAdminsDisponibles(@Request() req: any) {
    return this.inboxService.getAdminsDisponibles(req.user.id);
  }

  // ==================== ELIMINACIÓN ====================

  @Delete('conversaciones/:id/historial')
  @Roles('admin')
  @ApiOperation({
    summary: 'Eliminar historial de mensajes de una conversación',
  })
  @ApiParam({ name: 'id', description: 'ID de la conversación' })
  @ApiResponse({ status: 200, description: 'Historial eliminado exitosamente' })
  @ApiResponse({ status: 404, description: 'Conversación no encontrada' })
  async eliminarHistorialConversacion(@Param('id', ParseIntPipe) id: number) {
    return this.inboxService.eliminarHistorialConversacion(id);
  }

  @Delete('historial-completo')
  @Roles('admin')
  @ApiOperation({ summary: 'Eliminar todo el historial del inbox' })
  @ApiResponse({
    status: 200,
    description: 'Todo el historial eliminado exitosamente',
  })
  async eliminarTodoElHistorial() {
    return this.inboxService.eliminarTodoElHistorial();
  }
}
