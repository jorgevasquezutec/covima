import { AbsoluteFill, Audio, staticFile, Sequence } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { IntroScene } from "./scenes/IntroScene";
import { PuntosScene } from "./scenes/PuntosScene";
import { ParticipacionScene } from "./scenes/ParticipacionScene";
import { EspiritualScene } from "./scenes/EspiritualScene";
import { RachaScene } from "./scenes/RachaScene";
import { NivelesScene } from "./scenes/NivelesScene";
import { RankingScene } from "./scenes/RankingScene";
import { OutroScene } from "./scenes/OutroScene";

interface Durations {
  intro: number;
  puntos: number;
  participacion: number;
  espiritual: number;
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
}> = ({ voiceover, children }) => {
  return (
    <AbsoluteFill>
      {children}
      <Sequence from={15} premountFor={5}>
        <Audio src={staticFile(`voiceover/${voiceover}`)} volume={1} />
      </Sequence>
    </AbsoluteFill>
  );
};

export const PromoVideo: React.FC<{ durations: Durations }> = ({ durations }) => {
  const t = durations.transition;

  return (
    <AbsoluteFill>
      {/* Background music - volume bajo para que se escuche la voz */}
      <Audio src={staticFile("music.mp3")} volume={0.08} />

      <TransitionSeries>
        {/* 1. Intro */}
        <TransitionSeries.Sequence durationInFrames={durations.intro}>
          <SceneWithVoice voiceover="01-intro.mp3">
            <IntroScene />
          </SceneWithVoice>
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: t })}
        />

        {/* 2. Puntos */}
        <TransitionSeries.Sequence durationInFrames={durations.puntos}>
          <SceneWithVoice voiceover="02-puntos.mp3">
            <PuntosScene />
          </SceneWithVoice>
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={linearTiming({ durationInFrames: t })}
        />

        {/* 3. Participación */}
        <TransitionSeries.Sequence durationInFrames={durations.participacion}>
          <SceneWithVoice voiceover="03-participacion.mp3">
            <ParticipacionScene />
          </SceneWithVoice>
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: t })}
        />

        {/* 4. Espiritual */}
        <TransitionSeries.Sequence durationInFrames={durations.espiritual}>
          <SceneWithVoice voiceover="04-espiritual.mp3">
            <EspiritualScene />
          </SceneWithVoice>
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: t })}
        />

        {/* 5. Racha */}
        <TransitionSeries.Sequence durationInFrames={durations.racha}>
          <SceneWithVoice voiceover="05-racha.mp3">
            <RachaScene />
          </SceneWithVoice>
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={linearTiming({ durationInFrames: t })}
        />

        {/* 6. Niveles */}
        <TransitionSeries.Sequence durationInFrames={durations.niveles}>
          <SceneWithVoice voiceover="06-niveles.mp3">
            <NivelesScene />
          </SceneWithVoice>
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: t })}
        />

        {/* 7. Ranking */}
        <TransitionSeries.Sequence durationInFrames={durations.ranking}>
          <SceneWithVoice voiceover="07-ranking.mp3">
            <RankingScene />
          </SceneWithVoice>
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: "from-bottom" })}
          timing={linearTiming({ durationInFrames: t })}
        />

        {/* 8. Outro */}
        <TransitionSeries.Sequence durationInFrames={durations.outro}>
          <SceneWithVoice voiceover="08-outro.mp3">
            <OutroScene />
          </SceneWithVoice>
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
