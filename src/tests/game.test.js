import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WORLD, PLAYER, SCORING, UPGRADES, UPGRADE_TYPES, SPAWNING, CAMERA, COMBAT } from '../config/GameConfig';

// ---------------------------------------------------------------------------
// Game scene logic smoke tests
//
// We replicate game-state logic as plain functions/objects so we can run
// tests without needing a Phaser renderer. Constants come from GameConfig.
// ---------------------------------------------------------------------------

function makeGame(overrides = {}) {
    return {
        air: PLAYER.MAX_AIR,
        score: 0,
        money: 0,
        crystals: 0,
        difficulty: 1,
        isGameOver: false,
        player: { y: 400, health: PLAYER.MAX_HEALTH, setTint: vi.fn() },
        physics: { pause: vi.fn() },
        soundManager: { play: vi.fn() },
        scene: { restart: vi.fn() },
        ...overrides,

        depleteAir() {
            if (this.player.y > WORLD.WATERLINE_Y && !this.isGameOver) {
                this.air -= PLAYER.AIR_DEPLETION;
                if (this.air <= 0) this.gameOver();
            }
        },

        gameOver() {
            if (this.isGameOver) return;
            this.isGameOver = true;
            this.physics.pause();
            this.player.setTint(0xff0000);
        },

        collectTreasure(p, t) {
            t.destroy();
            this.money += SCORING.TREASURE_MONEY;
            this.score += SCORING.TREASURE_SCORE;
            this.soundManager.play('collect');
        },

        collectAir(p, b) {
            const v = b.getData('visual'); if (v) v.destroy(); b.destroy();
            this.air = Math.min(PLAYER.MAX_AIR, this.air + PLAYER.AIR_BUBBLE_RESTORE);
            this.soundManager.play('bubble');
        },

        collectScuba(p, t) {
            t.destroy();
            this.air = PLAYER.MAX_AIR;
            this.score += SCORING.SCUBA_SCORE;
            this.soundManager.play('scuba');
        },

        collectMermaid(p, m) {
            m.destroy();
            this.crystals += 1;
            this.money += SCORING.MERMAID_MONEY;
            this.score += SCORING.MERMAID_SCORE;
            p.health = Math.min(PLAYER.MAX_HEALTH, p.health + 1);
            this.soundManager.play('mermaid');
        },

        collectCrystal(p, c) {
            c.destroy();
            this.crystals += 1;
            this.score += SCORING.CRYSTAL_SCORE;
            this.soundManager.play('crystal');
        },

        calcLightingAlpha(playerY) {
            return Math.max(0, Math.min(0.8, (playerY - WORLD.WATERLINE_Y) / (WORLD.DEPTH - WORLD.WATERLINE_Y)));
        },
    };
}

const makeItem = () => ({ destroy: vi.fn(), getData: vi.fn(() => null) });

// ---------------------------------------------------------------------------
// GameConfig
// ---------------------------------------------------------------------------
describe('GameConfig', () => {
    it('has consistent world boundaries', () => {
        expect(WORLD.WATERLINE_Y).toBeLessThan(WORLD.DEPTH);
        expect(WORLD.SPAWN_MIN_Y).toBeGreaterThan(WORLD.WATERLINE_Y);
        expect(WORLD.SPAWN_MAX_Y).toBeLessThan(WORLD.DEPTH);
    });

    it('has valid upgrade types', () => {
        expect(UPGRADE_TYPES.length).toBeGreaterThan(0);
        UPGRADE_TYPES.forEach(t => {
            expect(t).toHaveProperty('key');
            expect(t).toHaveProperty('label');
            expect(t).toHaveProperty('color');
            expect(t).toHaveProperty('permanent');
        });
    });

    it('has both permanent and temporary upgrades', () => {
        const permanent = UPGRADE_TYPES.filter(t => t.permanent);
        const temporary = UPGRADE_TYPES.filter(t => !t.permanent);
        expect(permanent.length).toBeGreaterThan(0);
        expect(temporary.length).toBeGreaterThan(0);
    });

    it('has spawn intervals for all entity types', () => {
        expect(SPAWNING.INTERVALS).toHaveProperty('airBubble');
        expect(SPAWNING.INTERVALS).toHaveProperty('pirate');
        expect(SPAWNING.INTERVALS).toHaveProperty('swordfish');
        expect(SPAWNING.INTERVALS).toHaveProperty('pirateShip');
        expect(SPAWNING.INTERVALS).toHaveProperty('mermaid');
    });

    it('has camera zoom values where surface < diving', () => {
        expect(CAMERA.SURFACE_ZOOM).toBeLessThan(CAMERA.DIVING_ZOOM);
    });
});

// ---------------------------------------------------------------------------
// depleteAir
// ---------------------------------------------------------------------------
describe('Game – depleteAir', () => {
    let game;
    beforeEach(() => { game = makeGame(); });

    it('reduces air by configured amount when player is underwater', () => {
        game.player.y = 400;
        game.depleteAir();
        expect(game.air).toBe(PLAYER.MAX_AIR - PLAYER.AIR_DEPLETION);
    });

    it('does NOT deplete air when player is on the surface', () => {
        game.player.y = WORLD.WATERLINE_Y;
        game.depleteAir();
        expect(game.air).toBe(PLAYER.MAX_AIR);
    });

    it('does NOT deplete air when game is over', () => {
        game.isGameOver = true;
        game.depleteAir();
        expect(game.air).toBe(PLAYER.MAX_AIR);
    });

    it('triggers gameOver when air reaches 0', () => {
        game.air = PLAYER.AIR_DEPLETION;
        game.depleteAir();
        expect(game.air).toBe(0);
        expect(game.isGameOver).toBe(true);
    });

    it('triggers gameOver when air goes negative', () => {
        game.air = 1;
        game.depleteAir();
        expect(game.isGameOver).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// gameOver
// ---------------------------------------------------------------------------
describe('Game – gameOver', () => {
    let game;
    beforeEach(() => { game = makeGame(); });

    it('sets isGameOver to true', () => {
        game.gameOver();
        expect(game.isGameOver).toBe(true);
    });

    it('pauses physics', () => {
        game.gameOver();
        expect(game.physics.pause).toHaveBeenCalledOnce();
    });

    it('tints the player red', () => {
        game.gameOver();
        expect(game.player.setTint).toHaveBeenCalledWith(0xff0000);
    });

    it('is idempotent — calling twice does not double-pause', () => {
        game.gameOver();
        game.gameOver();
        expect(game.physics.pause).toHaveBeenCalledOnce();
    });
});

// ---------------------------------------------------------------------------
// collectTreasure
// ---------------------------------------------------------------------------
describe('Game – collectTreasure', () => {
    let game;
    beforeEach(() => { game = makeGame(); });

    it('adds correct money and score', () => {
        game.collectTreasure(game.player, makeItem());
        expect(game.money).toBe(SCORING.TREASURE_MONEY);
        expect(game.score).toBe(SCORING.TREASURE_SCORE);
    });

    it('destroys the treasure item', () => {
        const item = makeItem();
        game.collectTreasure(game.player, item);
        expect(item.destroy).toHaveBeenCalledOnce();
    });

    it('plays collect sound', () => {
        game.collectTreasure(game.player, makeItem());
        expect(game.soundManager.play).toHaveBeenCalledWith('collect');
    });
});

// ---------------------------------------------------------------------------
// collectAir
// ---------------------------------------------------------------------------
describe('Game – collectAir', () => {
    let game;
    beforeEach(() => { game = makeGame(); });

    it('adds air bubble restore amount', () => {
        game.air = 80;
        game.collectAir(game.player, makeItem());
        expect(game.air).toBe(80 + PLAYER.AIR_BUBBLE_RESTORE);
    });

    it('clamps air to max', () => {
        game.air = PLAYER.MAX_AIR - 1;
        game.collectAir(game.player, makeItem());
        expect(game.air).toBe(PLAYER.MAX_AIR);
    });

    it('plays bubble sound', () => {
        game.collectAir(game.player, makeItem());
        expect(game.soundManager.play).toHaveBeenCalledWith('bubble');
    });

    it('destroys visual if present', () => {
        const visual = { destroy: vi.fn() };
        const bubble = { destroy: vi.fn(), getData: vi.fn(() => visual) };
        game.collectAir(game.player, bubble);
        expect(visual.destroy).toHaveBeenCalledOnce();
    });
});

// ---------------------------------------------------------------------------
// collectScuba
// ---------------------------------------------------------------------------
describe('Game – collectScuba', () => {
    let game;
    beforeEach(() => { game = makeGame({ air: 40 }); });

    it('restores air to full', () => {
        game.collectScuba(game.player, makeItem());
        expect(game.air).toBe(PLAYER.MAX_AIR);
    });

    it('adds score', () => {
        game.collectScuba(game.player, makeItem());
        expect(game.score).toBe(SCORING.SCUBA_SCORE);
    });

    it('plays scuba sound', () => {
        game.collectScuba(game.player, makeItem());
        expect(game.soundManager.play).toHaveBeenCalledWith('scuba');
    });
});

// ---------------------------------------------------------------------------
// collectMermaid
// ---------------------------------------------------------------------------
describe('Game – collectMermaid', () => {
    let game;
    beforeEach(() => { game = makeGame(); });

    it('adds crystal, money, and score', () => {
        game.collectMermaid(game.player, makeItem());
        expect(game.crystals).toBe(1);
        expect(game.money).toBe(SCORING.MERMAID_MONEY);
        expect(game.score).toBe(SCORING.MERMAID_SCORE);
    });

    it('heals player by 1', () => {
        game.player.health = 2;
        game.collectMermaid(game.player, makeItem());
        expect(game.player.health).toBe(3);
    });

    it('caps player health at max', () => {
        game.player.health = PLAYER.MAX_HEALTH;
        game.collectMermaid(game.player, makeItem());
        expect(game.player.health).toBe(PLAYER.MAX_HEALTH);
    });

    it('plays mermaid sound', () => {
        game.collectMermaid(game.player, makeItem());
        expect(game.soundManager.play).toHaveBeenCalledWith('mermaid');
    });
});

// ---------------------------------------------------------------------------
// collectCrystal
// ---------------------------------------------------------------------------
describe('Game – collectCrystal', () => {
    let game;
    beforeEach(() => { game = makeGame(); });

    it('adds crystal and score', () => {
        game.collectCrystal(game.player, makeItem());
        expect(game.crystals).toBe(1);
        expect(game.score).toBe(SCORING.CRYSTAL_SCORE);
    });

    it('plays crystal sound', () => {
        game.collectCrystal(game.player, makeItem());
        expect(game.soundManager.play).toHaveBeenCalledWith('crystal');
    });
});

// ---------------------------------------------------------------------------
// updateLighting alpha formula
// ---------------------------------------------------------------------------
describe('Game – updateLighting alpha', () => {
    let game;
    beforeEach(() => { game = makeGame(); });

    it('is 0 at the surface', () => {
        expect(game.calcLightingAlpha(WORLD.WATERLINE_Y)).toBe(0);
    });

    it('is 0 above the surface', () => {
        expect(game.calcLightingAlpha(0)).toBe(0);
        expect(game.calcLightingAlpha(WORLD.WATERLINE_Y - 1)).toBe(0);
    });

    it('reaches max alpha 0.8 at full depth', () => {
        expect(game.calcLightingAlpha(WORLD.DEPTH)).toBeCloseTo(0.8, 5);
    });

    it('never exceeds 0.8 even at extreme depth', () => {
        expect(game.calcLightingAlpha(9999)).toBe(0.8);
    });

    it('is proportional between surface and max depth', () => {
        const midY = WORLD.WATERLINE_Y + (WORLD.DEPTH - WORLD.WATERLINE_Y) / 2;
        expect(game.calcLightingAlpha(midY)).toBeCloseTo(0.5, 5);
    });
});

// ---------------------------------------------------------------------------
// Full session smoke test
// ---------------------------------------------------------------------------
describe('Game – full session smoke test', () => {
    it('collects items and depletes air correctly over a dive', () => {
        const game = makeGame();
        game.player.y = 500;

        game.collectTreasure(game.player, makeItem());
        game.collectCrystal(game.player, makeItem());
        game.collectAir(game.player, makeItem());

        for (let i = 0; i < 10; i++) game.depleteAir();

        expect(game.score).toBe(SCORING.TREASURE_SCORE + SCORING.CRYSTAL_SCORE);
        expect(game.money).toBe(SCORING.TREASURE_MONEY);
        expect(game.crystals).toBe(1);
        expect(game.air).toBe(PLAYER.MAX_AIR - 10 * PLAYER.AIR_DEPLETION);
        expect(game.isGameOver).toBe(false);
    });

    it('ends in game over when air runs out', () => {
        const game = makeGame({ air: 10 });
        game.player.y = 500;

        for (let i = 0; i < 6; i++) game.depleteAir();

        expect(game.isGameOver).toBe(true);
    });
});
