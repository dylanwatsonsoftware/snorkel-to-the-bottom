import Phaser from 'phaser';
import { Swordfish } from '../entities/Swordfish';
import { PirateShip } from '../entities/PirateShip';
import { Pirate } from '../entities/Pirate';
import { AirBubble } from '../entities/AirBubble';
import { WORLD, SPAWNING } from '../config/GameConfig';
import { Mermaid } from '../entities/Mermaid';

export class WorldManager {
    constructor(scene) {
        this.scene = scene;
    }

    createGroups() {
        const physics = this.scene.physics;
        this.treasures = physics.add.group();
        this.airBubbles = physics.add.group();
        this.scubaTanks = physics.add.group();
        this.pirates = physics.add.group();
        this.mermaids = physics.add.group();
        this.crystalsGroup = physics.add.group();
        this.swordfishGroup = physics.add.group();
        this.pirateShips = physics.add.group();
        this.cannonballs = physics.add.group();
        this.surfaceUpgrades = physics.add.group();
    }

    generateWorldItems() {
        const counts = SPAWNING.INITIAL;
        for (let i = 0; i < counts.treasures; i++) this.spawnTreasure();
        for (let i = 0; i < counts.crystals; i++) this.spawnCrystal();
        for (let i = 0; i < counts.scuba; i++) this.spawnScubaTank();
        for (let i = 0; i < counts.pirates; i++) this.spawnPirate();
        for (let i = 0; i < counts.mermaids; i++) this.spawnMermaid();
    }

    setupPeriodicSpawning() {
        const intervals = SPAWNING.INTERVALS;
        this.scene.time.addEvent({ delay: intervals.airBubble, callback: () => this.spawnAirBubble(), loop: true });
        this.scene.time.addEvent({ delay: intervals.pirate, callback: () => this.spawnPirate(), loop: true });
        this.scene.time.addEvent({ delay: intervals.swordfish, callback: () => this.spawnSwordfish(), loop: true });
        this.scene.time.addEvent({ delay: intervals.pirateShip, callback: () => this.spawnPirateShip(), loop: true });
        this.scene.time.addEvent({ delay: intervals.mermaid, callback: () => this.spawnMermaid(), loop: true });
    }

    update() {
        this.swordfishGroup.getChildren().forEach(fish => {
            if (fish.update) fish.update();
        });

        this.mermaids.getChildren().forEach(mermaid => {
            if (mermaid.update) mermaid.update();
        });

        this.pirateShips.getChildren().forEach(ship => {
            if (ship.update) ship.update(this.scene.boat, this.scene.difficulty);
        });

        this.airBubbles.getChildren().forEach(bubble => {
            if (bubble.update) {
                bubble.update();
            } else {
                const visual = bubble.getData('visual');
                if (visual) {
                    visual.setPosition(bubble.x, bubble.y);
                    if (bubble.y < WORLD.WATERLINE_Y) {
                        visual.destroy();
                        bubble.destroy();
                    }
                }
            }
        });

        const worldWidth = this.scene.physics.world.bounds.width;
        this.cannonballs.getChildren().forEach(ball => {
            if (ball.x < -100 || ball.x > worldWidth + 500) {
                ball.destroy();
            } else if (ball.body && ball.body.velocity.y > 0 && ball.y >= (WORLD.WATERLINE_Y)) {
                // Cannonball splashes into the water
                this.scene.effectsManager.createSplash(ball.x, WORLD.WATERLINE_Y);
                ball.destroy();
            }
        });
    }

    // ── Spawn Methods ────────────────────────────────────────────────

    spawnTreasure() {
        const pos = this.getSafeSpawnPos();
        if (pos) {
            const t = this.treasures.create(pos.x, pos.y, 'treasure').setScale(0.25);
            t.body.setSize(t.width * 0.4, t.height * 0.4);
            t.body.setOffset(t.width * 0.3, t.height * 0.3);
        }
    }

    spawnCrystal(x, y) {
        if (x === undefined) {
            const pos = this.getSafeSpawnPos();
            if (!pos) return;
            x = pos.x; y = pos.y;
        }
        const c = this.crystalsGroup.create(x, y, 'crystal').setScale(0.15);
        c.body.setSize(c.width * 0.4, c.height * 0.4);
        c.body.setOffset(c.width * 0.3, c.height * 0.3);
        c.body.setVelocityX(Phaser.Math.Between(-20, 20));
        c.body.setAllowGravity(false);
    }

    spawnScubaTank() {
        const pos = this.getSafeSpawnPos();
        if (pos) {
            const t = this.scubaTanks.create(pos.x, pos.y, 'scuba').setScale(0.3);
            t.body.setSize(t.width * 0.4, t.height * 0.4);
            t.body.setOffset(t.width * 0.3, t.height * 0.3);
            t.body.setVelocityX(Phaser.Math.Between(-10, 10));
            t.body.setAllowGravity(false);
        }
    }

    spawnAirBubble() {
        const pos = this.getSafeSpawnPos();
        if (!pos) return;
        const bubble = new AirBubble(this.scene, pos.x, pos.y);
        this.airBubbles.add(bubble);
    }

    spawnPirate() {
        const cam = this.scene.cameras.main;
        const deepMin = WORLD.WATERLINE_Y + 250;
        const x = cam.worldView.right + 200;
        const minY = Math.max(deepMin, cam.worldView.top + 50);
        const maxY = Math.max(minY + 50, Math.min(WORLD.SPAWN_MAX_Y - 100, cam.worldView.bottom));
        // Don't spawn if camera is near the surface and can't place deep enough
        if (maxY < deepMin) return;
        const y = Phaser.Math.Between(minY, maxY);
        const safeY = (Math.abs(y - this.scene.player.y) < 100) ? y + 200 : y;
        const finalY = Math.max(deepMin, Math.min(WORLD.SPAWN_MAX_Y, safeY));
        const pirate = new Pirate(this.scene, x, finalY);
        this.pirates.add(pirate);
        pirate.setSpeed(this.scene.difficulty);
    }

    spawnSwordfish() {
        if (this.scene.player.y <= WORLD.WATERLINE_Y + 150) return;
        const cam = this.scene.cameras.main;
        const side = Phaser.Math.Between(0, 1);
        const x = side === 0 ? cam.worldView.left - 100 : cam.worldView.right + 100;
        const minY = Math.max(WORLD.WATERLINE_Y + 200, cam.worldView.top);
        const y = Phaser.Math.Between(minY, Math.min(WORLD.SPAWN_MAX_Y - 100, cam.worldView.bottom));
        const fish = new Swordfish(this.scene, x, y);
        this.swordfishGroup.add(fish);
    }

    spawnMermaid() {
        const cam = this.scene.cameras.main;
        const side = Phaser.Math.Between(0, 1);
        const x = side === 0 ? cam.worldView.right + 200 : cam.worldView.left - 200;
        const deepMin = WORLD.WATERLINE_Y + 200;
        const minY = Math.max(deepMin, cam.worldView.top + 50);
        const maxY = Math.max(minY + 50, Math.min(WORLD.SPAWN_MAX_Y - 100, cam.worldView.bottom));
        if (maxY < deepMin) return;
        const y = Phaser.Math.Between(minY, maxY);
        const velX = side === 0 ? -100 : 100;
        const m = new Mermaid(this.scene, x, y, velX);
        this.mermaids.add(m);
        m.swim();
        if (Phaser.Math.Between(0, 1) === 1) this.spawnCrystal(x, y);
    }

    spawnPirateShip() {
        if (this.scene.gameMode !== 'surface') return;
        const cam = this.scene.cameras.main;
        const side = Phaser.Math.Between(0, 1);
        const x = side === 0 ? cam.worldView.left - 100 : cam.worldView.right + 100;
        const ship = new PirateShip(this.scene, x, WORLD.WATERLINE_Y);
        this.pirateShips.add(ship);
    }

    getSafeSpawnPos() {
        let attempts = 0;
        const worldWidth = Math.max(this.scene.scale.width, WORLD.MIN_WIDTH);
        while (attempts < 10) {
            const x = Phaser.Math.Between(50, worldWidth - 50);
            const y = Phaser.Math.Between(WORLD.SPAWN_MIN_Y, WORLD.SPAWN_MAX_Y);
            if (Phaser.Math.Distance.Between(x, y, this.scene.player.x, this.scene.player.y) < 300) { attempts++; continue; }
            if (this.scene.physics.overlapCirc(x, y, SPAWNING.MIN_SPACING).length === 0) return { x, y };
            attempts++;
        }
        return null;
    }
}
