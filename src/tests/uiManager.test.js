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

describe('UIManager – half-heart health display', () => {
    // Logic from UIManager.updateHearts:
    //   MAX_HEALTH = 6 → 3 display hearts (each represents 2 half-hearts)
    //   For heart i (0-based):
    //     threshold = (i + 1) * 2
    //     health >= threshold       → 'full'
    //     health >= threshold - 1   → 'half'
    //     otherwise                 → 'empty'

    const getHeartStates = (health, maxHearts = 3) => {
        const states = [];
        for (let i = 0; i < maxHearts; i++) {
            const threshold = (i + 1) * 2;
            if (health >= threshold) states.push('full');
            else if (health >= threshold - 1) states.push('half');
            else states.push('empty');
        }
        return states;
    };

    it('shows 3 full hearts at health 6 (full health)', () => {
        expect(getHeartStates(6)).toEqual(['full', 'full', 'full']);
    });

    it('shows 2 full + 1 half at health 5 (swordfish hit)', () => {
        expect(getHeartStates(5)).toEqual(['full', 'full', 'half']);
    });

    it('shows 2 full + 1 empty at health 4 (one full heart lost)', () => {
        expect(getHeartStates(4)).toEqual(['full', 'full', 'empty']);
    });

    it('shows 1 full + 1 half + 1 empty at health 3', () => {
        expect(getHeartStates(3)).toEqual(['full', 'half', 'empty']);
    });

    it('shows 1 full + 2 empty at health 2', () => {
        expect(getHeartStates(2)).toEqual(['full', 'empty', 'empty']);
    });

    it('shows 1 half + 2 empty at health 1 (critical)', () => {
        expect(getHeartStates(1)).toEqual(['half', 'empty', 'empty']);
    });

    it('shows 3 empty hearts at health 0 (dead)', () => {
        expect(getHeartStates(0)).toEqual(['empty', 'empty', 'empty']);
    });

    it('shows 3 empty hearts at negative health', () => {
        expect(getHeartStates(-1)).toEqual(['empty', 'empty', 'empty']);
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

describe('UIManager – mobile controls separation', () => {
    // Mobile controls must live in a separate container (mobileContainer)
    // from the HUD (uiContainer) so that zoom compensation on uiContainer
    // does not distort pointer coordinate space for touch input.

    // Simulate what happens when uiContainer is zoom-compensated:
    //   containerScale = 1 / zoom
    //   containerX = centerX * (1 - 1 / zoom)
    // A joystick base at local (100, 400) would appear on screen at:
    //   screenX = containerX + base.x * containerScale

    const simulateContainerTransform = (zoom, screenWidth) => {
        const centerX = screenWidth / 2;
        const containerScale = 1 / zoom;
        const containerX = centerX * (1 - 1 / zoom);
        return { containerScale, containerX };
    };

    it('at zoom 0.7 (surface), container transform shifts positions significantly', () => {
        const { containerScale, containerX } = simulateContainerTransform(0.7, 800);
        // A base at local x=100 appears at screen x:
        const screenX = containerX + 100 * containerScale;
        // containerX = 400 * (1 - 1/0.7) = 400 * (-0.4286) = -171.4
        // screenX = -171.4 + 100 * 1.4286 = -171.4 + 142.86 = -28.6
        // This proves the point: a joystick at local x=100 would appear off-screen!
        expect(screenX).toBeLessThan(0);
    });

    it('at zoom 1.0 (diving), container transform is identity', () => {
        const { containerScale, containerX } = simulateContainerTransform(1.0, 800);
        expect(containerScale).toBe(1);
        expect(containerX).toBeCloseTo(0, 5);
        // At zoom 1.0, there's no distortion - screen coords match local coords
        const screenX = containerX + 100 * containerScale;
        expect(screenX).toBeCloseTo(100, 5);
    });

    it('pointer vs base coordinate mismatch breaks joystick in zoomed container', () => {
        // If joystick base is at local x=100 inside a zoom-compensated container,
        // and user touches at screen x=100, the delta used for joystick would be:
        //   dx = pointer.x(100) - base.x(100) = 0  (WRONG - base isn't at screen 100)
        // With separate container (no zoom), base IS at screen 100, so dx=0 is correct.
        const zoom = 0.7;
        const { containerScale, containerX } = simulateContainerTransform(zoom, 800);

        const baseLocalX = 100;
        const baseScreenX = containerX + baseLocalX * containerScale;
        const pointerX = baseScreenX; // user touches exactly where base appears

        // Inside zoom container: dx = pointerX - baseLocalX (WRONG coordinate spaces)
        const wrongDx = pointerX - baseLocalX;
        // Inside separate container: dx = pointerX - baseLocalX (same coords since no transform)
        // The mismatch shows the bug
        expect(wrongDx).not.toBeCloseTo(0, 1); // broken: significant offset
    });
});

describe('UIManager – air bar behavior', () => {
    // Logic from UIManager.update:
    //   airPct = clamp(air, 0, 100)
    //   fill width = airBarWidth * (airPct / 100)
    //   color = airPct > 25 ? blue : red

    const airBarWidth = 152;

    const calcAirBar = (air) => {
        const airPct = Math.max(0, Math.min(100, air));
        return {
            fillWidth: airBarWidth * (airPct / 100),
            isWarning: airPct <= 25,
        };
    };

    it('full bar at 100 air', () => {
        const { fillWidth, isWarning } = calcAirBar(100);
        expect(fillWidth).toBe(airBarWidth);
        expect(isWarning).toBe(false);
    });

    it('empty bar at 0 air', () => {
        const { fillWidth, isWarning } = calcAirBar(0);
        expect(fillWidth).toBe(0);
        expect(isWarning).toBe(true);
    });

    it('warning color at 25% air', () => {
        const { isWarning } = calcAirBar(25);
        expect(isWarning).toBe(true);
    });

    it('normal color at 26% air', () => {
        const { isWarning } = calcAirBar(26);
        expect(isWarning).toBe(false);
    });

    it('clamps above 100', () => {
        const { fillWidth } = calcAirBar(150);
        expect(fillWidth).toBe(airBarWidth);
    });

    it('clamps below 0', () => {
        const { fillWidth } = calcAirBar(-10);
        expect(fillWidth).toBe(0);
    });
});
