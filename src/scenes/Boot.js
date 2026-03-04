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
    }

    create() {
        this.scene.start('Game');
    }
}
