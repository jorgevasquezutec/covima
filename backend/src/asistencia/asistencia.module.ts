import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AsistenciaController } from './asistencia.controller';
import { AsistenciaService } from './asistencia.service';
import { AsistenciaGateway } from './gateway/asistencia.gateway';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [
        PrismaModule,
        JwtModule.register({
            secret: process.env.JWT_SECRET || 'your-secret-key',
        }),
    ],
    controllers: [AsistenciaController],
    providers: [AsistenciaService, AsistenciaGateway],
    exports: [AsistenciaService, AsistenciaGateway],
})
export class AsistenciaModule { }
