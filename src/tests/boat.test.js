import { describe, it, expect, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Boat velocity logic smoke tests
//
// Boat.update() logic:
//   if (!isDiving)  body.setVelocityX(moveX * speed)
//   else            body.setVelocityX(0)
// ---------------------------------------------------------------------------

// Plain function mirroring Boat.update without Phaser
function boatUpdate(body, isDiving, moveX, speed) {
    if (!isDiving) {
        body.setVelocityX(moveX * speed);
    } else {
        body.setVelocityX(0);
    }
}

function makeBody() {
    let vx = 0;
    return { setVelocityX: vi.fn((v) => { vx = v; }), getVx: () => vx };
}

describe('Boat – update velocity', () => {
    it('moves right on the surface', () => {
        const body = makeBody();
        boatUpdate(body, false, 1, 200);
        expect(body.setVelocityX).toHaveBeenCalledWith(200);
    });

    it('moves left on the surface', () => {
        const body = makeBody();
        boatUpdate(body, false, -1, 200);
        expect(body.setVelocityX).toHaveBeenCalledWith(-200);
    });

    it('stops when player is diving', () => {
        const body = makeBody();
        boatUpdate(body, true, 1, 200);
        expect(body.setVelocityX).toHaveBeenCalledWith(0);
    });

    it('stops when diving regardless of move direction', () => {
        const body = makeBody();
        boatUpdate(body, true, -1, 200);
        expect(body.setVelocityX).toHaveBeenCalledWith(0);
    });

    it('is stationary when moveX is 0 on the surface', () => {
        const body = makeBody();
        boatUpdate(body, false, 0, 200);
        expect(body.setVelocityX).toHaveBeenCalledWith(0);
    });

    it('respects speed multiplier', () => {
        const body = makeBody();
        boatUpdate(body, false, 1, 350);
        expect(body.setVelocityX).toHaveBeenCalledWith(350);
    });
});
