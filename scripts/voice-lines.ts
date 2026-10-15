// Prints every spoken line as JSON for scripts/make-voices.py.
import { allVoiceLines } from '../src/game/voiceLines';

process.stdout.write(JSON.stringify(allVoiceLines()));
