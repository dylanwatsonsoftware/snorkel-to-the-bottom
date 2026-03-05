import Phaser from 'phaser';

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
        this.hp = 3;
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
