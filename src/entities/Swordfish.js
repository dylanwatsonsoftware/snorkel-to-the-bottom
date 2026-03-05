import Phaser from 'phaser';
import { COMBAT } from '../config/GameConfig';

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
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0) {
            this.body.setVelocity(
                (dx / dist) * this.speed,
                (dy / dist) * this.speed
            );
        }

        this.setFlipX(this.body.velocity.x < 0);
    }
}
