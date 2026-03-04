import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// UIManager pure-logic smoke tests
//
// UIManager methods all rely on a live Phaser scene (add.text, etc.), so we
// test the *logic* by replicating the pure math inline — no imports needed.
// ---------------------------------------------------------------------------

describe('UIManager – depth calculation', () => {
    // Logic from UIManager.update:
    //   const currentDepth = Math.max(0, Math.floor((playerY - 300) / 10));

    const calcDepth = (playerY) => Math.max(0, Math.floor((playerY - 300) / 10));

    it('returns 0m at the surface (playerY = 300)', () => {
        expect(calcDepth(300)).toBe(0);
    });

    it('returns 0m above the surface (playerY < 300)', () => {
        expect(calcDepth(0)).toBe(0);
        expect(calcDepth(299)).toBe(0);
    });

    it('returns correct depth below surface', () => {
        expect(calcDepth(400)).toBe(10);   // 100px below = 10m
        expect(calcDepth(800)).toBe(50);   // 500px below = 50m
        expect(calcDepth(1300)).toBe(100); // 1000px below = 100m
    });

    it('floors fractional depths', () => {
        expect(calcDepth(305)).toBe(0);   // only 5px below → floored to 0
        expect(calcDepth(315)).toBe(1);   // 15px → 1m
    });
});

describe('UIManager – health hearts display', () => {
    // Logic from UIManager.update:
    //   const hearts = '❤️'.repeat(Math.max(0, health));

    const heartsFor = (health) => '❤️'.repeat(Math.max(0, health));

    it('shows 3 hearts at full health', () => {
        expect(heartsFor(3)).toBe('❤️❤️❤️');
    });

    it('shows 0 hearts when health is 0', () => {
        expect(heartsFor(0)).toBe('');
    });

    it('shows 0 hearts when health is negative', () => {
        expect(heartsFor(-1)).toBe('');
    });

    it('shows 1 heart at health 1', () => {
        expect(heartsFor(1)).toBe('❤️');
    });
});

describe('UIManager – joystick getMovement', () => {
    // Logic from UIManager.getMovement:
    //   if (!active) return { x: 0, y: 0 };
    //   return { x: cos(angle) * (distance / 50), y: sin(angle) * (distance / 50) };

    const getMovement = (active, angle, distance) => {
        if (!active) return { x: 0, y: 0 };
        return {
            x: Math.cos(angle) * (distance / 50),
            y: Math.sin(angle) * (distance / 50),
        };
    };

    it('returns zero vector when joystick is inactive', () => {
        const mv = getMovement(false, Math.PI / 4, 40);
        expect(mv.x).toBe(0);
        expect(mv.y).toBe(0);
    });

    it('returns positive x when pointing right (angle = 0)', () => {
        const mv = getMovement(true, 0, 50);
        expect(mv.x).toBeCloseTo(1, 5);
        expect(mv.y).toBeCloseTo(0, 5);
    });

    it('returns negative x when pointing left (angle = π)', () => {
        const mv = getMovement(true, Math.PI, 50);
        expect(mv.x).toBeCloseTo(-1, 5);
        expect(mv.y).toBeCloseTo(0, 5);
    });

    it('scales linearly with distance', () => {
        const half = getMovement(true, 0, 25);
        expect(half.x).toBeCloseTo(0.5, 5);
    });

    it('maxes out at distance 60 (base radius)', () => {
        const maxMoved = getMovement(true, 0, 60);
        expect(maxMoved.x).toBeCloseTo(60 / 50, 5);
    });
});

describe('UIManager – handleJoystickMove math', () => {
    // Logic from UIManager.handleJoystickMove:
    //   const dx = pointer.x - base.x;
    //   const dy = pointer.y - base.y;
    //   const distance = Math.sqrt(dx*dx + dy*dy);
    //   const maxDistance = 60;
    //   angle = Math.atan2(dy, dx);
    //   clampedDistance = Math.min(distance, maxDistance);

    const calcJoystick = (bx, by, px, py) => {
        const dx = px - bx;
        const dy = py - by;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const maxDistance = 60;
        return {
            distance: Math.min(distance, maxDistance),
            angle: Math.atan2(dy, dx),
        };
    };

    it('clamps distance to 60 when pointer is far away', () => {
        const { distance } = calcJoystick(100, 100, 250, 100); // 150px right
        expect(distance).toBe(60);
    });

    it('does not clamp distance when pointer is within range', () => {
        const { distance } = calcJoystick(100, 100, 130, 100); // 30px right
        expect(distance).toBeCloseTo(30, 5);
    });

    it('angle is 0 when pointing straight right', () => {
        const { angle } = calcJoystick(100, 100, 200, 100);
        expect(angle).toBeCloseTo(0, 5);
    });

    it('angle is π/2 when pointing straight down', () => {
        const { angle } = calcJoystick(100, 100, 100, 200);
        expect(angle).toBeCloseTo(Math.PI / 2, 5);
    });
});
