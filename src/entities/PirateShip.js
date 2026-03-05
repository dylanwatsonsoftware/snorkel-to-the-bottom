import Phaser from 'phaser';
import { COMBAT } from '../config/GameConfig';

export class PirateShip extends Phaser.GameObjects.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'pirateship');
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setScale(0.8);
        this.body.setAllowGravity(false);
        this.body.setImmovable(true);
        this.body.setSize(this.width * 0.7, this.height * 0.4);
        this.body.setOffset(this.width * 0.15, this.height * 0.5);

        this.scene = scene;
        this.hp = COMBAT.PIRATE_SHIP_HP;
    }

    update(target, difficulty) {
        if (this.getData('dying')) return;
        const dx = target.x - this.x;
        const speed = COMBAT.PIRATE_SHIP_SPEED * difficulty;
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
}
