import { useEffect } from 'react';

import type { Exercise, LangCode } from '@/domain';
import { speak, stopSpeaking } from '@/speech';

import { FillBlank } from './exercises/FillBlank';
import { ListenType } from './exercises/ListenType';
import { MatchPairs } from './exercises/MatchPairs';
import { SelectTranslation } from './exercises/SelectTranslation';
import { Speak } from './exercises/Speak';
import { TranslateBuild } from './exercises/TranslateBuild';
import { autoPlayText } from './helpers';

export interface ExerciseViewProps {
  exercise: Exercise;
  targetLang: LangCode;
  disabled: boolean;
  onAnswer: (isCorrect: boolean, userAnswer?: string) => void;
}

/** Dispatches to the renderer for the exercise type and auto-plays target-language prompts. */
export function ExerciseView({ exercise, targetLang, disabled, onAnswer }: ExerciseViewProps) {
  useEffect(() => {
    const text = autoPlayText(exercise, targetLang);
    if (text) void speak(text, targetLang);
    return () => void stopSpeaking();
  }, [exercise, targetLang]);

  const common = { onAnswer, disabled, targetLang };
  switch (exercise.type) {
    case 'select_translation':
      return <SelectTranslation key={exercise.id} exercise={exercise} {...common} />;
    case 'translate_build':
      return <TranslateBuild key={exercise.id} exercise={exercise} {...common} />;
    case 'match_pairs':
      return <MatchPairs key={exercise.id} exercise={exercise} {...common} />;
    case 'listen_type':
      return <ListenType key={exercise.id} exercise={exercise} {...common} />;
    case 'speak':
      return <Speak key={exercise.id} exercise={exercise} {...common} />;
    case 'fill_blank':
      return <FillBlank key={exercise.id} exercise={exercise} {...common} />;
  }
}
