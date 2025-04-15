// frontend/src/utils/constants.ts
import rocketImageSrc from "../assets/booster.webp";
import backgroundImage from "../assets/landingsite.webp";
import explosionSprite from "../assets/explosion.png";

export const rocketImage = new Image();
rocketImage.src = rocketImageSrc;

export const backgroundImg = new Image();
backgroundImg.src = backgroundImage;

export const explosionImage = new Image();
explosionImage.src = explosionSprite;

export const DEFAULT_ASPECT_RATIO = 0.75;
export const ROCKET_WIDTH = 13;
export const ROCKET_HEIGHT = 60;
export const SCALE_FACTOR = 0.2;
export const GROUND_OFFSET = 50;
export const TEXT_PADDING_L = 10;
export const TEXT_PADDING_R = 10;
export const TEXT_INITIAL_Y = 20;
export const TEXT_LINE_HEIGHT = 15;
export const SPEED_THRESHOLD = 5; // Max safe landing speed
export const ANGLE_THRESHOLD = 10; // Max safe landing angle (degrees)
export const TOTAL_EXPLOSION_FRAMES = 25;
export const EXPLOSION_FRAME_DURATION = 60; // milliseconds per frame

// *** NEW: Flame and Thruster Constants ***
export const MAX_FLAME_LENGTH = 25; // Max length of the flame at full throttle
export const FLAME_WIDTH = 8; // Width of the flame base
export const FLAME_COLOR_INNER = "rgba(255, 255, 255, 0.9)"; // White hot center
export const FLAME_COLOR_OUTER = "rgba(255, 165, 0, 0.5)"; // Orange/Yellow outer glow

export const THRUSTER_LENGTH = 6; // Length of the cold gas thruster visualization
export const THRUSTER_WIDTH = 3; // Width of the cold gas thruster visualization
export const THRUSTER_COLOR = "rgba(173, 216, 230, 0.8)"; // Light blue / white-ish
export const THRUSTER_OFFSET_Y = 5; // Vertical offset from the top of the rocket
export const THRUSTER_OFFSET_X = ROCKET_WIDTH / 2 + 1; // Horizontal offset from the center
// *** END NEW ***
