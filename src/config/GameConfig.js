export const WORLD = {
    WATERLINE_Y: 300,
    DEPTH: 3000,
    MIN_WIDTH: 800,
    SPAWN_MIN_Y: 400,
    SPAWN_MAX_Y: 2900,
};

export const PLAYER = {
    MAX_AIR: 100,
    MAX_HEALTH: 6,
    AIR_DEPLETION: 3,
    AIR_BUBBLE_RESTORE: 5,
    SWIM_SPEED: 200,
    BOAT_SPEED: 200,
};

export const CAMERA = {
    SURFACE_ZOOM: 0.7,
    DIVING_ZOOM: 1.0,
    LERP_SPEED: 0.05,
    FOLLOW_LERP: 0.1,
};

export const COMBAT = {
    CANNONBALL_SPEED: 400,
    CANNONBALL_LIFETIME: 3000,
    PIRATE_SPEED: 150,
    PIRATE_SHIP_SPEED: 60,
    SWORDFISH_SPEED: 120,
    PIRATE_SHIP_HP: 3,
};

export const SCORING = {
    TREASURE_MONEY: 200,
    TREASURE_SCORE: 500,
    SCUBA_SCORE: 100,
    MERMAID_MONEY: 100,
    MERMAID_SCORE: 500,
    CRYSTAL_SCORE: 1000,
    PIRATE_SCORE: 200,
    SWORDFISH_SCORE: 300,
    PIRATE_SHIP_SCORE: 500,
};

export const SPAWNING = {
    INITIAL: { treasures: 4, crystals: 2, scuba: 1, pirates: 1, mermaid: 1 },
    MIN_SPACING: 80,
    INTERVALS: {
        airBubble: 8000,
        pirate: 12000,
        swordfish: 15000,
        pirateShip: 12000,
        mermaid: 20000,
    },
};

export const UPGRADE_TYPES = [
    { key: 'airCapacity', label: '+AIR', color: 0x00ccff, permanent: true },
    { key: 'swimSpeed', label: '+SPD', color: 0x00ff88, permanent: true },
    { key: 'swordReach', label: '+SWD', color: 0xff8800, permanent: true },
    { key: 'doubleScore', label: '2xSCR', color: 0xffff00, permanent: false },
    { key: 'invincible', label: 'SHIELD', color: 0xff00ff, permanent: false },
    { key: 'speedBurst', label: 'RUSH', color: 0x00ffff, permanent: false },
];

export const UPGRADES = {
    MAX_PERMANENT: 3,
    TEMP_DURATION: 30000,
    DESPAWN_TIME: 15000,
    AIR_BONUS_PER_LEVEL: 10,
    SWIM_BONUS_FACTOR: 0.15,
    SPEED_BURST_BONUS: 2,
};
