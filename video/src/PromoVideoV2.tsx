import { AbsoluteFill, Audio, staticFile, Sequence } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { HookScene } from "./scenes/HookScene";
import { IntroScene } from "./scenes/IntroScene";
import { PuntosScene } from "./scenes/PuntosScene";
import { ParticipacionScene } from "./scenes/ParticipacionScene";
import { EstudiosBiblicosScene } from "./scenes/EstudiosBiblicosScene";
import { RachaScene } from "./scenes/RachaScene";
import { NivelesScene } from "./scenes/NivelesScene";
import { RankingScene } from "./scenes/RankingScene";
import { BrowserDemo } from "./components/BrowserDemo";

interface Durations {
  hook: number;
  intro: number;
  puntos: number;
  participacion: number;
  estudios: number;
  racha: number;
  niveles: number;
  ranking: number;
  outro: number;
  transition: number;
}

// Scene wrapper that plays voiceover at the start of each scene
const SceneWithVoice: React.FC<{
  voiceover: string;
  children: React.ReactNode;
  delay?: number;
}> = ({ voiceover, children, delay = 10 }) => {
  return (
    <AbsoluteFill>
      {children}
      <Sequence from={delay} premountFor={5}>
        <Audio src={staticFile(`voiceover/${voiceover}`)} volume={1} />
      </Sequence>
    </AbsoluteFill>
  );
};

export const PromoVideoV2: React.FC<{ durations: Durations }> = ({ durations }) => {
  const t = durations.transition;

  return (
    <AbsoluteFill>
      {/* Background music */}
      <Audio src={staticFile("music.mp3")} volume={0.08} />

      <TransitionSeries>
        {/* 1. Hook - Involucrarse */}
        <TransitionSeries.Sequence durationInFrames={durations.hook}>
          <SceneWithVoice voiceover="01-hook.mp3">
            <HookScene />
          </SceneWithVoice>
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: t })}
        />

        {/* 2. Intro - COVIMA */}
        <TransitionSeries.Sequence durationInFrames={durations.intro}>
          <SceneWithVoice voiceover="02-intro.mp3">
            <IntroScene />
          </SceneWithVoice>
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={linearTiming({ durationInFrames: t })}
        />

        {/* 3. Puntos - Asistencias (JA, GP, Escuela Sabática) */}
        <TransitionSeries.Sequence durationInFrames={durations.puntos}>
          <SceneWithVoice voiceover="03-puntos.mp3">
            <PuntosScene />
          </SceneWithVoice>
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: t })}
        />

        {/* 4. Participación + Eventos */}
        <TransitionSeries.Sequence durationInFrames={durations.participacion}>
          <SceneWithVoice voiceover="04-participacion.mp3">
            <ParticipacionScene />
          </SceneWithVoice>
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={linearTiming({ durationInFrames: t })}
        />

        {/* 5. Estudios Bíblicos */}
        <TransitionSeries.Sequence durationInFrames={durations.estudios}>
          <SceneWithVoice voiceover="05-estudios.mp3">
            <EstudiosBiblicosScene />
          </SceneWithVoice>
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: t })}
        />

        {/* 6. Racha */}
        <TransitionSeries.Sequence durationInFrames={durations.racha}>
          <SceneWithVoice voiceover="06-racha.mp3">
            <RachaScene />
          </SceneWithVoice>
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={linearTiming({ durationInFrames: t })}
        />

        {/* 7. Niveles */}
        <TransitionSeries.Sequence durationInFrames={durations.niveles}>
          <SceneWithVoice voiceover="07-niveles.mp3">
            <NivelesScene />
          </SceneWithVoice>
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: t })}
        />

        {/* 8. Ranking */}
        <TransitionSeries.Sequence durationInFrames={durations.ranking}>
          <SceneWithVoice voiceover="08-ranking.mp3">
            <RankingScene />
          </SceneWithVoice>
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: "from-bottom" })}
          timing={linearTiming({ durationInFrames: t })}
        />

        {/* 9. Outro - Browser demo */}
        <TransitionSeries.Sequence durationInFrames={durations.outro}>
          <SceneWithVoice voiceover="09-outro.mp3">
            <BrowserDemo />
          </SceneWithVoice>
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
