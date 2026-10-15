// Prints every story scene as JSON for scripts/make-scenes.py.
import { CHAPTER_SCENES, EPILOGUE_SCENES, sceneKey } from '../src/game/scenes';

const out = [
  ...Object.entries(CHAPTER_SCENES).flatMap(([ch, scenes]) => scenes.map((s, i) => ({ key: sceneKey('chapter', i, Number(ch)), ...s }))),
  ...EPILOGUE_SCENES.map((s, i) => ({ key: sceneKey('epilogue', i), ...s })),
];
process.stdout.write(JSON.stringify(out));
