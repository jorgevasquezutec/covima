import {
  Info, Music, Users, Heart, BookOpen, Star,
  MessageCircle, Sparkles, Mic, Zap, Newspaper,
  type LucideIcon,
} from 'lucide-react';
import type { PlantillaPrograma } from '@/types';

interface PlantillaExportableProps {
  plantilla: PlantillaPrograma;
  versiculo?: string;
  cita?: string;
}

const COLOR = {
  primary: '#1a4731',
  accent: '#2d6a4f',
  light: '#8db5a0',
  dots: '#7a9e8c',
  red: '#c0392b',
  bg: '#f4f8f6',
  white: '#ffffff',
  border: '#c5d9ce',
};

function getPartIcon(nombre: string): LucideIcon {
  const n = nombre.toLowerCase();
  if (n.includes('himno') || n.includes('canto')) return Music;
  if (n.includes('oración') || n.includes('ofrenda') || n.includes('diezmo') || n.includes('recojo')) return Heart;
  if (n.includes('bienvenida') || n.includes('ingreso') || n.includes('despedida')) return Users;
  if (n.includes('lectura') || n.includes('bíblica') || n.includes('reavivados')) return BookOpen;
  if (n.includes('testimonio')) return MessageCircle;
  if (n.includes('especial')) return Sparkles;
  if (n.includes('tema') || n.includes('predicador')) return Mic;
  if (n.includes('adoración')) return Star;
  if (n.includes('anuncio')) return Info;
  if (n.includes('notijoven')) return Newspaper;
  if (n.includes('dinámica')) return Zap;
  return Info;
}

function isHimno(nombre: string): boolean {
  const n = nombre.toLowerCase();
  return n.includes('himno') && !n.includes('canto');
}

function isCanto(nombre: string): boolean {
  return nombre.toLowerCase().includes('canto');
}

function TemplateColumn({ plantilla, versiculo, cita }: PlantillaExportableProps) {
  const partes = [...plantilla.partes].sort((a, b) => a.orden - b.orden);

  return (
    <div style={{
      flex: 1,
      border: `1.5px solid ${COLOR.border}`,
      borderRadius: '6px',
      padding: '28px 22px 20px',
      backgroundColor: COLOR.white,
      display: 'flex',
      flexDirection: 'column' as const,
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center' as const, marginBottom: '18px' }}>
        <h1 style={{
          fontSize: '17px',
          fontWeight: 800,
          color: COLOR.primary,
          letterSpacing: '3px',
          margin: '0 0 3px 0',
          textTransform: 'uppercase' as const,
        }}>
          {plantilla.nombre.toUpperCase()}
        </h1>
        <p style={{
          fontSize: '11px',
          color: COLOR.accent,
          letterSpacing: '8px',
          margin: 0,
          fontWeight: 500,
        }}>
          C O V I M A
        </p>
      </div>

      {/* Separator */}
      <div style={{
        borderTop: `1px solid ${COLOR.border}`,
        marginBottom: '14px',
      }} />

      {/* Date field */}
      <div style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: '6px',
        marginBottom: '18px',
        fontSize: '11.5px',
        color: COLOR.primary,
      }}>
        <span style={{ fontWeight: 700 }}>Fecha:</span>
        <span style={{ fontStyle: 'italic', color: COLOR.accent }}>Sáb,</span>
        <span style={{
          borderBottom: `1px solid ${COLOR.primary}`,
          width: '35px',
          display: 'inline-block',
        }}>&nbsp;</span>
        <span>de</span>
        <span style={{
          borderBottom: `1px solid ${COLOR.primary}`,
          flex: 1,
          display: 'inline-block',
        }}>&nbsp;</span>
        <span>20</span>
        <span style={{
          borderBottom: `1px solid ${COLOR.primary}`,
          width: '25px',
          display: 'inline-block',
        }}>&nbsp;</span>
      </div>

      {/* Parts */}
      <div style={{ flex: 1 }}>
        {partes.map((pp, i) => {
          const Icon = getPartIcon(pp.parte.nombre);
          const himno = isHimno(pp.parte.nombre);
          const canto = isCanto(pp.parte.nombre);

          return (
            <div key={pp.id} style={{ marginBottom: canto ? '2px' : '11px' }}>
              {/* Main part row */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '11px',
                color: COLOR.primary,
              }}>
                <span style={{
                  fontWeight: 700,
                  minWidth: '22px',
                  textAlign: 'right' as const,
                }}>
                  {i + 1}.
                </span>
                <Icon size={12} color={COLOR.accent} strokeWidth={2.2} />
                <span style={{ fontWeight: 700, whiteSpace: 'nowrap' as const }}>
                  {pp.parte.nombre}:
                </span>
                <span style={{
                  flex: 1,
                  borderBottom: `1px dotted ${COLOR.dots}`,
                  minWidth: '20px',
                }} />
                {himno && (
                  <>
                    <span style={{ color: COLOR.red, fontSize: '10px', fontWeight: 600, whiteSpace: 'nowrap' as const }}>
                      N°:
                    </span>
                    <span style={{
                      borderBottom: `2px solid ${COLOR.primary}`,
                      width: '32px',
                      display: 'inline-block',
                    }}>&nbsp;</span>
                  </>
                )}
              </div>

              {/* Sub-lines for cantos */}
              {canto && (
                <div style={{ paddingLeft: '44px', marginTop: '5px' }}>
                  {[1, 2, 3].map(n => (
                    <div key={n} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontSize: '10px',
                      color: COLOR.primary,
                      marginBottom: '4px',
                    }}>
                      <span style={{ fontSize: '8px' }}>•</span>
                      <span style={{
                        flex: 1,
                        borderBottom: `1px dotted ${COLOR.dots}`,
                      }} />
                      <span style={{ color: COLOR.red, fontSize: '10px', fontWeight: 600, whiteSpace: 'nowrap' as const }}>
                        N°:
                      </span>
                      <span style={{
                        borderBottom: `2px solid ${COLOR.primary}`,
                        width: '32px',
                        display: 'inline-block',
                      }}>&nbsp;</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      {versiculo && (
        <div style={{
          textAlign: 'center' as const,
          marginTop: '16px',
          paddingTop: '10px',
          borderTop: `1px solid ${COLOR.border}`,
        }}>
          <p style={{
            fontSize: '10px',
            fontStyle: 'italic',
            color: COLOR.accent,
            margin: '0 0 4px 0',
            lineHeight: '1.4',
          }}>
            "{versiculo}"
          </p>
          {cita && (
            <p style={{
              fontSize: '9px',
              color: COLOR.light,
              letterSpacing: '4px',
              margin: 0,
              fontWeight: 600,
            }}>
              {cita.toUpperCase()}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function PlantillaExportable({ plantilla, versiculo, cita }: PlantillaExportableProps) {
  return (
    <div style={{
      display: 'flex',
      gap: '0px',
      width: '1122px',
      padding: '16px',
      backgroundColor: COLOR.bg,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      <TemplateColumn plantilla={plantilla} versiculo={versiculo} cita={cita} />
      <div style={{
        width: '0px',
        borderLeft: `1.5px dashed ${COLOR.dots}`,
        margin: '0 12px',
      }} />
      <TemplateColumn plantilla={plantilla} versiculo={versiculo} cita={cita} />
    </div>
  );
}
