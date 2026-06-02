import Anthropic from '@anthropic-ai/sdk';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.static(__dirname));

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `Je bent een satirische ghostwriter die LinkedIn-posts schrijft in het overdreven AI-gegenereerde stijl.
Je schrijft parodieën op die typische zelfhulp-/ondernemers-LinkedIn posts vol met clichés.

Schrijfregels (VERPLICHT):
- Schrijf ALTIJD in het Nederlands
- Begin met een pakkende, dramatische openingszin over de genoemde gebeurtenis
- Gebruik ALTIJD minstens één tricolon/drieslag (drie woorden of zinnen na elkaar, bijv. "Groei. Pijn. Succes.")
- Gebruik ALTIJD staccato zinnen. Korte zinnen. Die indruk maken.
- Gebruik ALTIJD de constructie "Niet omdat [X]. Maar omdat [Y]."
- Gebruik ALTIJD "En eerlijk?" gevolgd door een clichématige openbaring
- Gebruik ALTIJD "Kortom:" voor de samenvatting
- Gebruik ALTIJD "Zeg eens eerlijk:" in een retorische vraag aan de lezer
- Voeg geforceerd het 🚀 emoji in op dramatische momenten
- Maak een GEFORCEERD maar PASSEND bruggetje van de specifieke gebeurtenis naar ondernemerschap/persoonlijke groei/succes
- Gebruik 3-5 bullet points met inzichten die klinken als diepzinnig maar niets zeggen
- Eindig met hashtags als #groei #ondernemen #succes #leiderschap #mindset #persoonlijkeontwikkeling plus 2-3 specifieke hashtags die passen bij de gebeurtenis
- De toon is zelfvoldaan, inspirerend, en grenzend aan het ridicule

Geef je antwoord als JSON met twee velden:
- "post": de volledige LinkedIn post tekst (inclusief emoji's en hashtags)
- "imageSuggestion": een cynische, sarcastische suggestie voor een afbeelding die NIKS met de post te maken heeft (bijv. een pose met een laptop in een koffiebar, een zonsondergang foto, een geforceerde smile in een pak)

Geef ALLEEN geldige JSON terug, geen uitleg of markdown.`;

app.post('/api/generate', async (req, res) => {
  const { event } = req.body;
  if (!event || !event.trim()) {
    return res.status(400).json({ error: 'Geen gebeurtenis opgegeven.' });
  }

  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 1024,
      thinking: { type: 'adaptive' },
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Schrijf een satirische LinkedIn post over deze gebeurtenis: "${event.trim()}"`,
        },
      ],
    });

    const textBlock = message.content.find((b) => b.type === 'text');
    if (!textBlock) throw new Error('Geen tekst in antwoord');

    let parsed;
    try {
      parsed = JSON.parse(textBlock.text);
    } catch {
      const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Kon JSON niet parseren uit antwoord');
      }
    }

    res.json({ post: parsed.post, imageSuggestion: parsed.imageSuggestion });
  } catch (err) {
    console.error('Claude API fout:', err);
    res.status(500).json({ error: 'Er ging iets mis bij het genereren. Probeer opnieuw.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`AI Slopposter draait op http://localhost:${PORT}`);
});
