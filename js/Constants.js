export const ASSETS = {
    base: 'assets/Shelf_Base.fbx',
    circle: 'assets/Shelf_Circle.fbx',
    hexa: 'assets/hexa_03.fbx',
    woodTex: 'assets/wood2_01.png',
    shadow1: 'assets/shadow_01.png',
    shadow2: 'assets/shadow_02.png'
};

export const COLORS = {
    RED: 0xFF3333,
    BLUE: 0x3366FF,
    GREEN: 0x33CC33,
    YELLOW: 0xFFCC00,
    PURPLE: 0xAA33FF,
    PINK: 0xFF66CC,
    ORANGE: 0xFF6633
};

// Calculate optimal columns based on circumference
const RADIUS = 1.8;
const HEXAGON_DIAMETER = 0.5; // 0.25 radius * 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const OPTIMAL_COLUMNS = Math.floor(CIRCUMFERENCE / HEXAGON_DIAMETER);

export const TOWER_CONFIG = {
    LEVELS: 6,
    COLUMNS: OPTIMAL_COLUMNS, // ~22 columns for perfect fit
    COLUMN_ANGLE: 360 / OPTIMAL_COLUMNS,
    LEVEL_HEIGHT: 1.0,
    RADIUS: RADIUS,
    HEXAGONS_PER_COLUMN: 5
};