import Phaser from 'phaser';
import { PLAYER } from '../config/GameConfig';

export class HUD extends Phaser.Scene {
    constructor() {
        super('HUD');
    }

    create() {
        const pad = 16;
        const dpr = Math.max(window.devicePixelRatio || 1, 2);

        // --- Left Panel: Semi-transparent background ---
        const panelBg = this.add.graphics();
        panelBg.fillStyle(0x000011, 0.4);
        panelBg.fillRoundedRect(pad - 8, pad - 6, 196, 120, 8);
        panelBg.lineStyle(1, 0x335577, 0.5);
        panelBg.strokeRoundedRect(pad - 8, pad - 6, 196, 120, 8);

        // --- Air Bar ---
        this.airBarWidth = 152;
        const barH = 10;
        const airY = pad + 8;

        this.add.image(pad + 8, airY, 'icon-bubble');

        const airBarBg = this.add.rectangle(pad + 26, airY, this.airBarWidth, barH, 0x112233)
            .setOrigin(0, 0.5);
        this.airBarFill = this.add.rectangle(pad + 26, airY, this.airBarWidth, barH, 0x22aadd)
            .setOrigin(0, 0.5);

        const airBarFrame = this.add.graphics();
        airBarFrame.lineStyle(1, 0x4488aa, 0.8);
        airBarFrame.strokeRect(pad + 25, airY - barH / 2 - 1, this.airBarWidth + 2, barH + 2);

        // --- Stats Grid (2x2) with icons ---
        const valStyle = {
            fontSize: '16px', fill: '#ffffff', fontStyle: 'bold',
            stroke: '#000', strokeThickness: 1.5,
            resolution: dpr
        };

        const col1 = pad;
        const col2 = pad + 98;
        const row1 = airY + 32;
        const row2 = row1 + 34;

        this.add.image(col1 + 8, row1 + 2, 'icon-star');
        this.scoreText = this.add.text(col1 + 20, row1 - 6, '0', valStyle);

        this.add.image(col2 + 8, row1 + 2, 'icon-coin');
        this.moneyText = this.add.text(col2 + 20, row1 - 6, '$0',
            { ...valStyle, fill: '#ffdd44' });

        this.add.image(col1 + 8, row2 + 2, 'icon-crystal');
        this.crystalsText = this.add.text(col1 + 20, row2 - 6, '0',
            { ...valStyle, fill: '#cc88ff' });

        this.add.image(col2 + 8, row2 + 2, 'icon-depth');
        this.depthText = this.add.text(col2 + 20, row2 - 6, '0m',
            { ...valStyle, fill: '#66ddff' });

        // --- Hearts (top-right) ---
        const { width } = this.scale;
        this.hearts = [];
        const maxHearts = Math.ceil(PLAYER.MAX_HEALTH / 2);
        const heartSpacing = 26;
        const heartsStartX = width - pad - maxHearts * heartSpacing + heartSpacing / 2;

        // Subtle panel behind hearts
        const heartPanelBg = this.add.graphics();
        heartPanelBg.fillStyle(0x110000, 0.35);
        heartPanelBg.fillRoundedRect(
            heartsStartX - 16, pad - 6,
            maxHearts * heartSpacing + 18, 32, 8
        );

        for (let i = 0; i < maxHearts; i++) {
            const heart = this.add.image(
                heartsStartX + i * heartSpacing, pad + 10, 'heart-full'
            ).setScale(1.3);
            this.hearts.push(heart);
        }
    }

    updateHUD(air, score, money, crystals, playerY, health) {
        // Air bar
        const airPct = Math.max(0, Math.min(100, air));
        this.airBarFill.width = this.airBarWidth * (airPct / 100);
        this.airBarFill.setFillStyle(airPct > 25 ? 0x22aadd : 0xcc3333);

        // Stats
        this.scoreText.setText(`${score}`);
        this.moneyText.setText(`$${money}`);
        this.crystalsText.setText(`${crystals}`);

        const currentDepth = Math.max(0, Math.floor((playerY - 300) / 10));
        this.depthText.setText(`${currentDepth}m`);

        // Hearts
        for (let i = 0; i < this.hearts.length; i++) {
            const threshold = (i + 1) * 2;
            if (health >= threshold) {
                this.hearts[i].setTexture('heart-full');
            } else if (health >= threshold - 1) {
                this.hearts[i].setTexture('heart-half');
            } else {
                this.hearts[i].setTexture('heart-empty');
            }
        }
    }
}
