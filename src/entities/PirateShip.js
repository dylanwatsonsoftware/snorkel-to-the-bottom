import Phaser from 'phaser';
import { SHIP_TYPES } from '../config/GameConfig';

export class PirateShip extends Phaser.GameObjects.Sprite {
    constructor(scene, x, y, shipType = 'standard') {
        const config = SHIP_TYPES[shipType];
        super(scene, x, y, config.key);
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setScale(config.scale);
        this.body.setAllowGravity(false);
        this.body.setImmovable(true);
        this.body.setSize(this.width * 0.7, this.height);
        this.body.setOffset(this.width * 0.15, 0);

        this.scene = scene;
        this.hp = config.hp;
        this.shipConfig = config;
    }

    update(target, difficulty) {
        if (this.getData('dying')) return;
        const dx = target.x - this.x;
        const speed = this.shipConfig.speed * difficulty;
        this.body.setVelocityX(dx > 0 ? speed : -speed);
        this.setFlipX(dx < 0);
    }

    takeDamage() {
        this.hp--;
        this.setTint(0xff8888);
        this.scene.time.delayedCall(100, () => {
            if (this.active) this.clearTint();
        });
        return this.hp <= 0;
    }

    getScore() {
        return this.shipConfig.score;
    }
}
