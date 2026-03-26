import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TiposRolTab } from './components/TiposRolTab';
import { ProgramacionTab } from './components/ProgramacionTab';
import { VistaActualTab } from './components/VistaActualTab';

export default function RolesServicioPage() {
  const [activeTab, setActiveTab] = useState('tipos');

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Roles de Servicio</h1>
        <p className="text-sm text-gray-500">
          Gestiona roles rotativos semanales: limpieza, flores, etc.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="tipos">Tipos de Rol</TabsTrigger>
          <TabsTrigger value="programacion">Programación</TabsTrigger>
          <TabsTrigger value="actual">Vista Actual</TabsTrigger>
        </TabsList>

        <TabsContent value="tipos">
          <TiposRolTab />
        </TabsContent>

        <TabsContent value="programacion">
          <ProgramacionTab />
        </TabsContent>

        <TabsContent value="actual">
          <VistaActualTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
