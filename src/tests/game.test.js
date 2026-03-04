import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Game scene logic smoke tests
//
// We extract and replicate just the game-state logic from Game.js as plain
// functions / objects so we can run end-to-end-ish tests without needing a
// Phaser renderer. Each section references the exact method in Game.js it
// mirrors so it's easy to keep them in sync.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Shared factory: a minimal game-state object matching what Game.js stores
// ---------------------------------------------------------------------------
function makeGame(overrides = {}) {
    return {
        air: 100,
        score: 0,
        money: 0,
        crystals: 0,
        difficulty: 1,
        isGameOver: false,
        player: { y: 400, health: 3, setTint: vi.fn() },
        physics: { pause: vi.fn() },
        soundManager: { play: vi.fn() },
        scene: { restart: vi.fn() },
        ...overrides,

        // ── Game.depleteAir ─────────────────────────────────────────────────
        depleteAir() {
            if (this.player.y > 300 && !this.isGameOver) {
                this.air -= 2;
                if (this.air <= 0) this.gameOver();
            }
        },

        // ── Game.gameOver ───────────────────────────────────────────────────
        gameOver() {
            if (this.isGameOver) return;
            this.isGameOver = true;
            this.physics.pause();
            this.player.setTint(0xff0000);
        },

        // ── Game.collectTreasure ────────────────────────────────────────────
        collectTreasure(p, t) {
            t.destroy();
            this.money += 200;
            this.score += 500;
            this.soundManager.play('collect');
        },

        // ── Game.collectAir ─────────────────────────────────────────────────
        collectAir(p, b) {
            const v = b.getData('visual'); if (v) v.destroy(); b.destroy();
            this.air = Math.min(100, this.air + 5);
            this.soundManager.play('bubble');
        },

        // ── Game.collectScuba ────────────────────────────────────────────────
        collectScuba(p, t) {
            t.destroy();
            this.air = 100;
            this.score += 100;
            this.soundManager.play('scuba');
        },

        // ── Game.collectMermaid ──────────────────────────────────────────────
        collectMermaid(p, m) {
            m.destroy();
            this.crystals += 1;
            this.money += 100;
            this.score += 500;
            p.health = Math.min(3, p.health + 1);
            this.soundManager.play('mermaid');
        },

        // ── Game.collectCrystal ──────────────────────────────────────────────
        collectCrystal(p, c) {
            c.destroy();
            this.crystals += 1;
            this.score += 1000;
            this.soundManager.play('crystal');
        },

        // ── Game.updateLighting (alpha formula only) ─────────────────────────
        calcLightingAlpha(playerY) {
            return Math.max(0, Math.min(0.8, (playerY - 300) / 2700));
        },
    };
}

// Helper stub for a collectible game object
const makeItem = () => ({ destroy: vi.fn(), getData: vi.fn(() => null) });

// ---------------------------------------------------------------------------
// depleteAir
// ---------------------------------------------------------------------------
describe('Game – depleteAir', () => {
    let game;
    beforeEach(() => { game = makeGame(); });

    it('reduces air by 2 when player is underwater', () => {
        game.player.y = 400;
        game.depleteAir();
        expect(game.air).toBe(98);
    });

    it('does NOT deplete air when player is on the surface (y <= 300)', () => {
        game.player.y = 300;
        game.depleteAir();
        expect(game.air).toBe(100);
    });

    it('does NOT deplete air when game is over', () => {
        game.isGameOver = true;
        game.depleteAir();
        expect(game.air).toBe(100);
    });

    it('triggers gameOver when air reaches 0', () => {
        game.air = 2;
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

    it('adds 200 money and 500 score', () => {
        const item = makeItem();
        game.collectTreasure(game.player, item);
        expect(game.money).toBe(200);
        expect(game.score).toBe(500);
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

    it('adds 5 air', () => {
        game.air = 80;
        const bubble = makeItem();
        game.collectAir(game.player, bubble);
        expect(game.air).toBe(85);
    });

    it('clamps air to 100', () => {
        game.air = 98;
        game.collectAir(game.player, makeItem());
        expect(game.air).toBe(100);
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
        expect(game.air).toBe(100);
    });

    it('adds 100 score', () => {
        game.collectScuba(game.player, makeItem());
        expect(game.score).toBe(100);
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

    it('adds 1 crystal, 100 money, 500 score', () => {
        game.collectMermaid(game.player, makeItem());
        expect(game.crystals).toBe(1);
        expect(game.money).toBe(100);
        expect(game.score).toBe(500);
    });

    it('heals player by 1', () => {
        game.player.health = 2;
        game.collectMermaid(game.player, makeItem());
        expect(game.player.health).toBe(3);
    });

    it('caps player health at 3', () => {
        game.player.health = 3;
        game.collectMermaid(game.player, makeItem());
        expect(game.player.health).toBe(3);
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

    it('adds 1 crystal and 1000 score', () => {
        game.collectCrystal(game.player, makeItem());
        expect(game.crystals).toBe(1);
        expect(game.score).toBe(1000);
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

    it('is 0 at the surface (y = 300)', () => {
        expect(game.calcLightingAlpha(300)).toBe(0);
    });

    it('is 0 above the surface (y < 300)', () => {
        expect(game.calcLightingAlpha(0)).toBe(0);
        expect(game.calcLightingAlpha(299)).toBe(0);
    });

    it('reaches max alpha 0.8 at full depth (y = 3000)', () => {
        expect(game.calcLightingAlpha(3000)).toBeCloseTo(0.8, 5);
    });

    it('never exceeds 0.8 even at extreme depth', () => {
        expect(game.calcLightingAlpha(9999)).toBe(0.8);
    });

    it('is proportional between surface and max depth', () => {
        // y=1650: (1650 - 300) / 2700 = 1350 / 2700 = 0.5
        expect(game.calcLightingAlpha(1650)).toBeCloseTo(0.5, 5);
    });
});

// ---------------------------------------------------------------------------
// Cumulative stat smoke test — simulates a short dive session
// ---------------------------------------------------------------------------
describe('Game – full session smoke test', () => {
    it('collects items and depletes air correctly over a dive', () => {
        const game = makeGame();
        game.player.y = 500; // underwater

        // Collect a few items
        game.collectTreasure(game.player, makeItem()); // +500 score, +200 money
        game.collectCrystal(game.player, makeItem());  // +1000 score, +1 crystal
        game.collectAir(game.player, makeItem());      // +5 air → still 100

        // Deplete air 10 times (−2 each = −20 total)
        for (let i = 0; i < 10; i++) game.depleteAir();

        expect(game.score).toBe(1500);
        expect(game.money).toBe(200);
        expect(game.crystals).toBe(1);
        expect(game.air).toBe(80);
        expect(game.isGameOver).toBe(false);
    });

    it('ends in game over when air runs out', () => {
        const game = makeGame({ air: 10 });
        game.player.y = 500;

        for (let i = 0; i < 6; i++) game.depleteAir(); // −12 air → 0 or below

        expect(game.isGameOver).toBe(true);
    });
});
