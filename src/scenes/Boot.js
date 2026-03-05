import Phaser from 'phaser';

export class Boot extends Phaser.Scene {
    constructor() {
        super('Boot');
    }

    preload() {
        // Load generated assets
        this.load.image('snorkeller', 'assets/snorkeller.png');
        this.load.image('boat', 'assets/boat.png');
        this.load.image('pirate', 'assets/pirate.png');
        this.load.image('treasure', 'assets/treasure.png');
        this.load.image('mermaid', 'assets/mermaid.png');
        this.load.image('scuba', 'assets/scuba.png');
        this.load.image('crystal', 'assets/crystal.png');
    }

    create() {
        this.generateTextures();
        this.scene.start('Game');
    }

    generateTextures() {
        // Swordfish
        const sf = this.add.graphics();
        // Body
        sf.fillStyle(0x4488bb, 1);
        sf.fillEllipse(40, 20, 50, 22);
        // Sword/bill
        sf.fillStyle(0x667788, 1);
        sf.fillTriangle(65, 18, 65, 22, 95, 20);
        // Tail fin
        sf.fillStyle(0x3366aa, 1);
        sf.fillTriangle(15, 20, 5, 8, 5, 32);
        // Dorsal fin
        sf.fillStyle(0x3377aa, 1);
        sf.fillTriangle(30, 9, 50, 9, 40, 2);
        // Eye
        sf.fillStyle(0xffffff, 1);
        sf.fillCircle(55, 18, 3);
        sf.fillStyle(0x000000, 1);
        sf.fillCircle(56, 18, 1.5);
        // Belly highlight
        sf.fillStyle(0x88bbdd, 0.5);
        sf.fillEllipse(40, 24, 40, 8);
        sf.generateTexture('swordfish', 100, 40);
        sf.destroy();

        // Cannonball
        const cb = this.add.graphics();
        cb.fillStyle(0x222222, 1);
        cb.fillCircle(8, 8, 8);
        cb.fillStyle(0x555555, 0.5);
        cb.fillCircle(6, 6, 3);
        cb.generateTexture('cannonball', 16, 16);
        cb.destroy();

        // Pirate ship
        const ps = this.add.graphics();
        // Hull
        ps.fillStyle(0x553311, 1);
        ps.fillRect(5, 30, 60, 18);
        ps.fillTriangle(5, 30, 0, 48, 5, 48);
        ps.fillTriangle(65, 30, 70, 48, 65, 48);
        // Deck
        ps.fillStyle(0x774422, 1);
        ps.fillRect(8, 28, 54, 6);
        // Mast
        ps.fillStyle(0x443322, 1);
        ps.fillRect(33, 2, 4, 28);
        // Sail
        ps.fillStyle(0xddddcc, 1);
        ps.fillTriangle(37, 4, 37, 24, 58, 14);
        // Flag
        ps.fillStyle(0x111111, 1);
        ps.fillRect(32, 0, 10, 8);
        // Skull on flag
        ps.fillStyle(0xffffff, 1);
        ps.fillCircle(37, 4, 2);
        ps.generateTexture('pirateship', 70, 50);
        ps.destroy();

        // Cloud
        const cl = this.add.graphics();
        cl.fillStyle(0xffffff, 0.8);
        cl.fillEllipse(25, 18, 30, 16);
        cl.fillEllipse(45, 15, 28, 18);
        cl.fillEllipse(65, 18, 32, 14);
        cl.fillStyle(0xffffff, 0.6);
        cl.fillEllipse(35, 22, 40, 12);
        cl.fillEllipse(55, 22, 36, 12);
        cl.generateTexture('cloud', 90, 34);
        cl.destroy();

        // Upgrade crate
        const uc = this.add.graphics();
        uc.fillStyle(0xcc8833, 1);
        uc.fillRect(2, 2, 20, 20);
        uc.lineStyle(2, 0x885522);
        uc.strokeRect(2, 2, 20, 20);
        uc.lineStyle(2, 0x885522);
        uc.lineBetween(12, 2, 12, 22);
        uc.lineBetween(2, 12, 22, 12);
        uc.fillStyle(0xffdd00, 1);
        uc.fillCircle(12, 12, 4);
        uc.generateTexture('upgrade', 24, 24);
        uc.destroy();
    }
}
