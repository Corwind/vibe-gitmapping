/** Default spacing between depth levels in the radial tree layout */
export const DEPTH_SPACING = 5;

/** Minimum angular separation between sibling nodes (in radians) */
export const MIN_ANGULAR_SEPARATION = 0.05;

/** Default color for files with unknown extensions */
export const DEFAULT_FILE_COLOR = 0x888888;

/** Playback speed: seconds of real time per day of git history */
export const DEFAULT_SECONDS_PER_DAY = 1;

/** Maximum number of commits to process per animation frame */
export const MAX_COMMITS_PER_FRAME = 10;

/** Duration (ms) of the pulse animation on a recently modified file */
export const FILE_PULSE_DURATION_MS = 2000;

/** Duration (ms) for a contributor to travel to its target file */
export const CONTRIBUTOR_TRAVEL_DURATION_MS = 500;

/** Duration (ms) for a deleted file to fade out */
export const FILE_FADEOUT_DURATION_MS = 1000;

/** Camera distance for the default overview position */
export const DEFAULT_CAMERA_DISTANCE = 50;

/** Available speed presets (seconds of real time per day of history).
 * Lower values = faster playback. Display as 1/value for user-friendly speed multiplier. */
export const SPEED_PRESETS: readonly number[] = [1, 0.5, 0.2, 0.1, 0.04, 0.02, 0.01];

/** Keyboard number key to speed preset mapping (1=1x slowest, 9=100x fastest) */
export const KEY_SPEED_MAP: Record<string, number> = {
  '1': 1,
  '2': 0.5,
  '3': 0.2,
  '4': 0.1,
  '5': 0.05,
  '6': 0.04,
  '7': 0.02,
  '8': 0.015,
  '9': 0.01,
};
