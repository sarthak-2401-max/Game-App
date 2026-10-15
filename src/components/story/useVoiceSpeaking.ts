import { useEffect, useState } from 'react';
import { voice } from '../../services/audio/voice';

/** Whether a voice line is playing right now. */
export function useVoiceSpeaking(): boolean {
  const [speaking, setSpeaking] = useState(voice.isSpeaking);
  useEffect(() => voice.onSpeakingChange(setSpeaking), []);
  return speaking;
}
