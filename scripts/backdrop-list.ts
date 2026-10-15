// Prints every environment's backdrop prompt as JSON for scripts/make-backdrops.py.
import { ENVIRONMENTS } from '../src/game/environments';

process.stdout.write(JSON.stringify(Object.values(ENVIRONMENTS).map((e) => ({ key: e.id, shot: e.backdrop }))));
