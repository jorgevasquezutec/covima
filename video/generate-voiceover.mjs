import fs from "fs";
import path from "path";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error("Set OPENAI_API_KEY environment variable");
  process.exit(1);
}

const scenes = [
  {
    name: "01-intro",
    text: "¿Sabías que tu compromiso con Dios y tu comunidad ahora tiene recompensa? Hoy te voy a explicar cómo funciona el sistema de puntos y niveles de nuestra sociedad de Jóvenes Adventistas.",
  },
  {
    name: "02-puntos",
    text: "Hay varias formas de ganar puntos. Cada sábado que vienes al programa ganas puntos automáticamente. Si llegas temprano ganas 5 puntos y 8 de experiencia. A tiempo son 3 puntos y 5 de experiencia. Y si llegas tarde, igual ganas 1 punto. Entre más temprano llegues, más puntos ganas.",
  },
  {
    name: "03-participacion",
    text: "También ganas puntos extra al participar en el programa. Por ejemplo, dirigir el programa, presentar el tema, cantar un especial, dar testimonio. Cada participación te acerca más a Dios y suma puntos adicionales.",
  },
  {
    name: "04-espiritual",
    text: "Pero recuerda, esto es más que puntos. Es tu camino de fe. Como dice Gálatas 6:9: No nos cansemos de hacer el bien, porque a su debido tiempo cosecharemos si no nos damos por vencidos. Cada punto refleja tu compromiso con Dios y tu comunidad.",
  },
  {
    name: "05-racha",
    text: "Mira esto: la racha. Tu racha cuenta cuántas semanas consecutivas has venido al programa. Tu constancia refleja tu compromiso con Dios. ¡Intenta no romperla!",
  },
  {
    name: "06-niveles",
    text: "Ahora hablemos de los niveles. Además de puntos, cada actividad te da experiencia. Al acumular experiencia subes de nivel en tu camino espiritual. Desde Explorador hasta Leyenda. ¡Tu meta es llegar al nivel más alto!",
  },
  {
    name: "07-ranking",
    text: "Y ahora lo más emocionante: el ranking. Aquí puedes ver quiénes son los más comprometidos de la sociedad. Cada trimestre es una nueva oportunidad para crecer juntos.",
  },
  {
    name: "08-outro",
    text: "Entonces recuerda: ven cada sábado y crece en tu fe. Mantén tu constancia. Participa y sirve en el programa. Sube de nivel en tu camino espiritual. Y crece junto a tu comunidad. ¡Te esperamos este sábado! Tu próximo paso de fe te está esperando.",
  },
];

const outDir = path.join(import.meta.dirname, "public", "voiceover");

async function generateAudio(scene) {
  console.log(`Generating: ${scene.name}...`);

  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "tts-1-hd",
      voice: "nova",
      input: scene.text,
      response_format: "mp3",
      speed: 1.05,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error for ${scene.name}: ${response.status} ${error}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const filePath = path.join(outDir, `${scene.name}.mp3`);
  fs.writeFileSync(filePath, buffer);
  console.log(`  Saved: ${filePath} (${(buffer.length / 1024).toFixed(1)} KB)`);
}

async function main() {
  console.log("Generating voiceover with OpenAI TTS (voice: nova, speed: 1.05)\n");

  for (const scene of scenes) {
    await generateAudio(scene);
  }

  console.log("\nDone! Voiceover files saved to public/voiceover/");
}

main().catch(console.error);
