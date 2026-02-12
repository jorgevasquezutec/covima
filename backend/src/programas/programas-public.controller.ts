import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ProgramasService } from './programas.service';

@ApiTags('Programas (Público)')
@Controller('programas/public')
export class ProgramasPublicController {
  constructor(private readonly programasService: ProgramasService) {}

  @Get(':codigo')
  @ApiOperation({ summary: 'Ver programa público por código' })
  async findByCodigo(@Param('codigo') codigo: string) {
    const programa = await this.programasService.findByCodigo(codigo);
    if (!programa) {
      throw new NotFoundException('Programa no encontrado');
    }
    return programa;
  }
}
