// Everything the cinematic story player needs for one beat's scene: the painting, where the
// characters' eyes are in it, and Pip's mood.
import type { Rig } from '../../components/story/SceneRig';
import { CHAPTER_SCENES, EPILOGUE_SCENES, sceneKey, type Mood } from '../../game/scenes';
import RIGS from '../../game/sceneRigs.generated.json';
import { SCENE_IMAGES } from './sceneImages.generated';

export interface StoryScene {
  source: number;
  rig: Rig;
  mood?: Mood;
}

function scene(key: string, mood?: Mood): StoryScene | undefined {
  const source = SCENE_IMAGES[key];
  return source === undefined ? undefined : { source, rig: (RIGS as Record<string, Rig>)[key] ?? {}, mood };
}

export function chapterScenes(chapter: number, beats: number): (StoryScene | undefined)[] {
  return Array.from({ length: beats }, (_, i) => scene(sceneKey('chapter', i, chapter), CHAPTER_SCENES[chapter]?.[i]?.mood));
}

export function epilogueScenes(beats: number): (StoryScene | undefined)[] {
  return Array.from({ length: beats }, (_, i) => scene(sceneKey('epilogue', i), EPILOGUE_SCENES[i]?.mood));
}
