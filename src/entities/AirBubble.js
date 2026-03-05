import Phaser from 'phaser';
import { WORLD } from '../config/GameConfig';

export class AirBubble extends Phaser.GameObjects.Zone {
    constructor(scene, x, y) {
        super(scene, x, y, 24, 24);
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.body.setSize(24, 24);
        this.body.setAllowGravity(false);
        this.body.setVelocityY(-30);

        this.visual = scene.add.container(x, y);
        this.visual.add([
            scene.add.circle(0, 0, 12, 0xadd8e6, 0.4),
            scene.add.circle(-4, -4, 4, 0xffffff, 0.6)
        ]);

        this.scene = scene;
    }

    update() {
        if (!this.active) return;
        this.visual.setPosition(this.x, this.y);
        if (this.y < WORLD.WATERLINE_Y) {
            this.cleanup();
        }
    }

    cleanup() {
        if (this.visual) {
            this.visual.destroy();
            this.visual = null;
        }
        this.destroy();
    }

    getData(key) {
        if (key === 'visual') return this.visual;
        return super.getData(key);
    }
}
