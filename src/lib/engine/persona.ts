/**
 * Unified persona & studio configuration for Ember video generation.
 * Single source of truth for branding, tutor persona, scene budgets, and pacing.
 */

export const STUDIO_PERSONA = {
  brandName: "Ember",
  brandTagline: "every problem, a lesson",
  tutorName: "Professor Ember",
  audience: "undergraduate students",
  styleReference: "The Organic Chemistry Tutor standard: calm, rigorous, and unhurried",
  
  // Lecture structure constraints
  minScenes: 6,
  maxScenes: 10,
  targetScenes: 7,
  
  // Timing & density budgets
  targetWordsPerMinute: 135,
  sceneDurationMinSec: 30,
  sceneDurationMaxSec: 50,
  wordsPerSceneMin: 65,
  wordsPerSceneMax: 105,
  
  // Board choreography rules
  contentBeatsPerSceneMin: 2,
  contentBeatsPerSceneMax: 4,
  maxCharsPerLine: 40,
  
  // Emphasis discipline
  maxBoxesPerVideo: 1, // Final boxed answer only
  maxUnderlinesPerVideo: 1, // Key governing rule only
} as const;
