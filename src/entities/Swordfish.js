import Phaser from 'phaser';
import { COMBAT, WORLD } from '../config/GameConfig';

const MIN_DEPTH = WORLD.WATERLINE_Y + 80;

export class Swordfish extends Phaser.GameObjects.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'swordfish');
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setScale(1.2);
        this.body.setAllowGravity(false);
        this.body.setSize(this.width * 0.6, this.height * 0.4);
        this.body.setOffset(this.width * 0.2, this.height * 0.3);

        this.scene = scene;
        this.speed = COMBAT.SWORDFISH_SPEED;
    }

    update() {
        if (this.getData('dying')) return;

        const player = this.scene.player;
        // Target the player, but never above MIN_DEPTH
        const targetY = Math.max(player.y, MIN_DEPTH);
        const dx = player.x - this.x;
        const dy = targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0) {
            this.body.setVelocity(
                (dx / dist) * this.speed,
                (dy / dist) * this.speed
            );
        }

        // Hard clamp — never breach the surface
        if (this.y < MIN_DEPTH) {
            this.y = MIN_DEPTH;
            if (this.body.velocity.y < 0) this.body.setVelocityY(0);
        }

        this.setFlipX(this.body.velocity.x < 0);
    }
}
