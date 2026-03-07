import Phaser from 'phaser';
import { COMBAT } from '../config/GameConfig';

export class Pirate extends Phaser.GameObjects.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'pirate');
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setScale(0.4);
        this.body.setSize(this.width * 0.6, this.height * 0.3);
        this.body.setOffset(this.width * 0.2, this.height * 0.35);
        this.body.setAllowGravity(false);

        this.scene = scene;
    }

    setSpeed(difficulty, direction) {
        // direction: -1 = swim left, 1 = swim right
        const dir = direction || -1;
        this.body.setVelocityX(dir * COMBAT.PIRATE_SPEED * difficulty);
        this.setFlipX(dir > 0);
    }
}
