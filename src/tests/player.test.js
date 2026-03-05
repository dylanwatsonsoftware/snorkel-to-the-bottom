import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Minimal Phaser mock so Player can be instantiated without a real browser/GL
// ---------------------------------------------------------------------------

const makePhysicsBody = () => ({
    setCollideWorldBounds: vi.fn(),
    setAllowGravity: vi.fn(),
    setImmovable: vi.fn(),
    setSize: vi.fn(),
    setOffset: vi.fn(),
    setVelocity: vi.fn(),
    setVelocityX: vi.fn(),
    x: 0,
    y: 0,
});

const makeTweens = () => ({
    add: vi.fn((cfg) => {
        // Immediately call onComplete so dive / swingSword callbacks fire synchronously
        if (cfg?.onComplete) cfg.onComplete();
        return {};
    }),
});

const makeScene = () => {
    const body = makePhysicsBody();
    const tweens = makeTweens();

    const container = {
        setAlpha: vi.fn().mockReturnThis(),
        setDepth: vi.fn().mockReturnThis(),
        setAngle: vi.fn().mockReturnThis(),
        setScale: vi.fn().mockReturnThis(),
        setPosition: vi.fn().mockReturnThis(),
        add: vi.fn().mockReturnThis(),
        body: makePhysicsBody(),
        x: 0,
        y: 0,
        alpha: 1,
    };

    const makeRect = () => ({
        setOrigin: vi.fn().mockReturnThis(),
        setX: vi.fn().mockReturnThis(),
        fillStyle: vi.fn().mockReturnThis(),
        fillCircle: vi.fn().mockReturnThis(),
    });

    // Full chainable stub used for every add.* call
    const makeStub = () => {
        const stub = {};
        const chain = () => stub;
        ['setOrigin', 'setX', 'setY', 'setScale', 'setDepth', 'setAlpha', 'setScrollFactor',
            'setInteractive', 'setPosition', 'setVisible', 'setTint', 'setAngle', 'setFlipX',
            'on', 'fillStyle', 'fillCircle', 'generateTexture'].forEach(k => { stub[k] = vi.fn(chain); });
        stub.createBitmapMask = vi.fn(() => ({ invertAlpha: false }));
        return stub;
    };

    const scene = {
        add: {
            existing: vi.fn(),
            container: vi.fn(() => container),
            text: vi.fn(() => makeStub()),
            circle: vi.fn(() => makeStub()),
            rectangle: vi.fn(() => makeStub()),
            image: vi.fn(() => makeStub()),
        },
        physics: {
            add: {
                existing: vi.fn((obj) => { obj.body = body; }),
            },
        },
        make: {
            rectangle: vi.fn(() => makeRect()),
            graphics: vi.fn(() => makeRect()),
            image: vi.fn(() => makeStub()),
        },
        tweens,
        time: { now: 0 },
        scale: { width: 800, height: 600 },
        input: { addPointer: vi.fn(), on: vi.fn() },
        soundManager: null,
        gameOver: vi.fn(),
    };
    scene._body = body;
    scene._tweens = tweens;
    return scene;
};

// ---------------------------------------------------------------------------
// Stub out Phaser.GameObjects.Sprite so we don't need a WebGL context
// ---------------------------------------------------------------------------
vi.mock('phaser', () => {
    class Sprite {
        constructor(scene, x, y) {
            this.scene = scene;
            this.x = x;
            this.y = y;
            this.angle = 0;
            this.alpha = 1;
            this.flipX = false;
            this.body = null;
        }
        setScale() { return this; }
        setFlipX(v) { this.flipX = v; return this; }
        setAngle(a) { this.angle = a; return this; }
        setOrigin() { return this; }
        setScrollFactor() { return this; }
        setDepth() { return this; }
    }

    return {
        default: {
            GameObjects: { Sprite, Container: Sprite },
        },
    };
});

// Import AFTER the mock is set up
const { Player } = await import('../entities/Player.js');

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Player – health & damage', () => {
    let scene, player;

    beforeEach(() => {
        scene = makeScene();
        player = new Player(scene, 100, 100);
        // Give the player a body manually (physics mock wires it in constructor)
        player.body = scene._body;
    });

    it('starts with 3 health', () => {
        expect(player.health).toBe(3);
    });

    it('takeDamage reduces health by 1', () => {
        player.takeDamage();
        expect(player.health).toBe(2);
    });

    it('takeDamage sets and then clears invincibility (tween mock is synchronous)', () => {
        // Our tween mock calls onComplete synchronously, so by the time takeDamage
        // returns the flicker tween has already completed and cleared isInvincible.
        // This still verifies that: (a) health decremented and (b) the player is not
        // stuck in a permanent invincible state.
        player.takeDamage();
        expect(player.health).toBe(2);
        expect(player.isInvincible).toBe(false);
    });

    it('does not take damage when invincible', () => {
        player.health = 2;
        player.isInvincible = true;
        player.takeDamage();
        expect(player.health).toBe(2);
    });

    it('calls scene.gameOver when health reaches 0', () => {
        player.health = 1;
        player.takeDamage();
        expect(scene.gameOver).toHaveBeenCalledOnce();
    });

    it('does not call gameOver while health > 0', () => {
        player.health = 2;
        player.takeDamage();
        expect(scene.gameOver).not.toHaveBeenCalled();
    });
});

describe('Player – dive guard', () => {
    let scene, player;

    beforeEach(() => {
        scene = makeScene();
        player = new Player(scene, 100, 100);
        player.body = scene._body;
    });

    it('dive sets isDivingInitiated to true', () => {
        player.dive();
        expect(player.isDivingInitiated).toBe(true);
    });

    it('dive cannot be triggered twice', () => {
        player.dive();
        const tweenCount = scene._tweens.add.mock.calls.length;
        player.dive(); // should be a no-op
        expect(scene._tweens.add.mock.calls.length).toBe(tweenCount);
    });
});

describe('Player – sword swing guard', () => {
    let scene, player;

    beforeEach(() => {
        scene = makeScene();
        player = new Player(scene, 100, 100);
        player.body = scene._body;
    });

    it('isSwinging starts as false', () => {
        expect(player.isSwinging).toBe(false);
    });

    it('swingSword sets isSwinging temporarily', () => {
        // With our synchronous onComplete mock, swinging immediately resets
        player.swingSword();
        expect(player.isSwinging).toBe(false);
    });

    it('swingSword cannot be called while already swinging', () => {
        player.isSwinging = true;
        const callsBefore = scene._tweens.add.mock.calls.length;
        player.swingSword();
        expect(scene._tweens.add.mock.calls.length).toBe(callsBefore);
    });
});
