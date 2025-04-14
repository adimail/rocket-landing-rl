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
export const SPEED_THRESHOLD = 5;
export const ANGLE_THRESHOLD = 10;
export const TOTAL_EXPLOSION_FRAMES = 25;
export const EXPLOSION_FRAME_DURATION = 30;
