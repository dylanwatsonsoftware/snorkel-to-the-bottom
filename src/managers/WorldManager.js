import Phaser from 'phaser';

export class WorldManager {
    constructor(scene) {
        this.scene = scene;
    }

    generateWorldItems() {
        const treasureCount = 25;
        const crystalCount = 15;
        const scubaCount = 8;

        for (let i = 0; i < treasureCount; i++) {
            this.scene.spawnTreasure();
        }

        for (let i = 0; i < crystalCount; i++) {
            this.scene.spawnCrystal();
        }

        for (let i = 0; i < scubaCount; i++) {
            this.scene.spawnScubaTank();
        }
    }

    setupPeriodicSpawning() {
        this.scene.time.addEvent({ delay: 5000, callback: this.scene.spawnAirBubble, callbackScope: this.scene, loop: true });
        this.scene.time.addEvent({ delay: 7000, callback: this.scene.spawnPirate, callbackScope: this.scene, loop: true });
        this.scene.time.addEvent({ delay: 10000, callback: this.scene.spawnSwordfish, callbackScope: this.scene, loop: true });
        this.scene.time.addEvent({ delay: 15000, callback: this.scene.spawnMermaid, callbackScope: this.scene, loop: true });
    }
}
