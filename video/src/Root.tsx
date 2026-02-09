import { Composition } from "remotion";
import { PromoVideo } from "./PromoVideo";
import { PromoVideoV2 } from "./PromoVideoV2";
import "./style.css";

const FPS = 30;

// === V1 Durations (legacy) ===
const V1_INTRO = Math.ceil(13 * FPS);
const V1_PUNTOS = Math.ceil(19.5 * FPS);
const V1_PARTICIPACION = Math.ceil(14.5 * FPS);
const V1_ESPIRITUAL = Math.ceil(17 * FPS);
const V1_RACHA = Math.ceil(11.5 * FPS);
const V1_NIVELES = Math.ceil(15 * FPS);
const V1_RANKING = Math.ceil(11.5 * FPS);
const V1_OUTRO = Math.ceil(17 * FPS);

const V1_TRANSITION_FRAMES = 15;
const V1_NUM_TRANSITIONS = 7;

const v1TotalFrames =
  V1_INTRO + V1_PUNTOS + V1_PARTICIPACION + V1_ESPIRITUAL + V1_RACHA + V1_NIVELES + V1_RANKING + V1_OUTRO
  - V1_NUM_TRANSITIONS * V1_TRANSITION_FRAMES;

const v1Durations = {
  intro: V1_INTRO,
  puntos: V1_PUNTOS,
  participacion: V1_PARTICIPACION,
  espiritual: V1_ESPIRITUAL,
  racha: V1_RACHA,
  niveles: V1_NIVELES,
  ranking: V1_RANKING,
  outro: V1_OUTRO,
  transition: V1_TRANSITION_FRAMES,
};

// === V2 Durations (new improved flow) ===
// Flujo: Hook → Intro → Puntos → Participación → Estudios → Racha → Niveles → Ranking → Outro
// Duraciones: audio real + ~2.5s margen
const HOOK = Math.ceil(12 * FPS);           // audio: 8.96s
const INTRO = Math.ceil(9.5 * FPS);         // audio: 6.92s
const PUNTOS = Math.ceil(10 * FPS);         // audio: 7.06s
const PARTICIPACION = Math.ceil(16 * FPS);  // audio: 13.33s
const ESTUDIOS = Math.ceil(11.5 * FPS);     // audio: 8.59s
const RACHA = Math.ceil(10 * FPS);          // audio: 7.20s
const NIVELES = Math.ceil(9 * FPS);         // audio: 6.13s
const RANKING = Math.ceil(8 * FPS);         // audio: 4.88s
const OUTRO = Math.ceil(15 * FPS);          // audio: 7.52s + animación browser

const TRANSITION_FRAMES = 15;
const NUM_TRANSITIONS = 8; // 9 escenas = 8 transiciones

const v2TotalFrames =
  HOOK + INTRO + PUNTOS + PARTICIPACION + ESTUDIOS + RACHA + NIVELES + RANKING + OUTRO
  - NUM_TRANSITIONS * TRANSITION_FRAMES;

const v2Durations = {
  hook: HOOK,
  intro: INTRO,
  puntos: PUNTOS,
  participacion: PARTICIPACION,
  estudios: ESTUDIOS,
  racha: RACHA,
  niveles: NIVELES,
  ranking: RANKING,
  outro: OUTRO,
  transition: TRANSITION_FRAMES,
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="PromoVideo"
        component={PromoVideo}
        durationInFrames={v1TotalFrames}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={{ durations: v1Durations }}
      />
      <Composition
        id="PromoVideoV2"
        component={PromoVideoV2}
        durationInFrames={v2TotalFrames}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={{ durations: v2Durations }}
      />
    </>
  );
};
