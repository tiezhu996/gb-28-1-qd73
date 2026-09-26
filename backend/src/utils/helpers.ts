export const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const calculateScoreDistribution = (scores: number[]): Record<string, number> => {
  const distribution: Record<string, number> = {
    '0-59': 0,
    '60-69': 0,
    '70-79': 0,
    '80-89': 0,
    '90-100': 0,
  };
  
  scores.forEach(score => {
    if (score < 60) distribution['0-59']++;
    else if (score < 70) distribution['60-69']++;
    else if (score < 80) distribution['70-79']++;
    else if (score < 90) distribution['80-89']++;
    else distribution['90-100']++;
  });
  
  return distribution;
};

export const compareAnswers = (
  userAnswer: string | string[],
  correctAnswer: string | string[]
): boolean => {
  if (Array.isArray(userAnswer) && Array.isArray(correctAnswer)) {
    return userAnswer.length === correctAnswer.length &&
      userAnswer.every((a, i) => a.trim() === correctAnswer[i].trim());
  }
  
  if (!Array.isArray(userAnswer) && !Array.isArray(correctAnswer)) {
    return userAnswer.trim() === correctAnswer.trim();
  }
  
  return false;
};

export const getRandomInt = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};
