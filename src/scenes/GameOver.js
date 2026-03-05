import Phaser from 'phaser';
import { submitScore, getTopScores, getCountryFlag, getRecentNames, saveRecentName } from '../services/LeaderboardService';

export class GameOver extends Phaser.Scene {
    constructor() {
        super('GameOver');
    }

    init(data) {
        this.finalScore = data.score || 0;
        this.finalDepth = data.depth || 0;
        this.playerFlag = getCountryFlag();
    }

    create() {
        const { width, height } = this.scale;
        const cx = width / 2;
        this.dpr = Math.max(window.devicePixelRatio || 1, 2) * 2;

        // Dark overlay
        this.add.rectangle(cx, height / 2, width, height, 0x000000, 0.75).setDepth(0);

        // GAME OVER title
        this.add.text(cx, 40, 'GAME OVER', {
            fontSize: '48px', fill: '#ff4444', fontStyle: 'bold',
            stroke: '#000', strokeThickness: 4, resolution: this.dpr
        }).setOrigin(0.5).setDepth(1);

        // Score display
        this.add.text(cx, 90, `Score: ${this.finalScore}  |  Depth: ${this.finalDepth}m`, {
            fontSize: '24px', fill: '#ffffff',
            stroke: '#000', strokeThickness: 2, resolution: this.dpr
        }).setOrigin(0.5).setDepth(1);

        // Country flag display
        this.flagText = this.add.text(cx + 115, 128, this.playerFlag, {
            fontSize: '26px', resolution: this.dpr
        }).setOrigin(0.5).setDepth(1);

        // "Enter your name" label
        this.add.text(cx, 128, 'Enter your name:', {
            fontSize: '20px', fill: '#aaddff',
            stroke: '#000', strokeThickness: 1, resolution: this.dpr
        }).setOrigin(0.5).setDepth(1);

        // HTML input for name entry
        this.createNameInput(cx, 160);

        // Recent names as clickable chips (only show if 2+ names to pick from)
        const showRecent = getRecentNames().length > 1;
        if (showRecent) this.createRecentNameChips(cx, 210);

        // Submit button (push down if recent names are shown)
        const submitY = showRecent ? 280 : 215;
        this.submitBtn = this.createButton(cx, submitY, 'SUBMIT SCORE', () => this.onSubmit());

        // Container for leaderboard (hidden until submit)
        this.leaderboardGroup = this.add.group();
    }

    createNameInput(cx, y) {
        const canvas = this.game.canvas;
        const rect = canvas.getBoundingClientRect();

        this.nameInput = document.createElement('input');
        this.nameInput.type = 'text';
        this.nameInput.maxLength = 15;
        this.nameInput.placeholder = 'Your name';
        this.nameInput.value = getRecentNames()[0] || '';

        Object.assign(this.nameInput.style, {
            position: 'absolute',
            width: '200px',
            padding: '8px 12px',
            fontSize: '18px',
            fontFamily: 'monospace',
            textAlign: 'center',
            background: '#112233',
            color: '#ffffff',
            border: '2px solid #4488aa',
            borderRadius: '6px',
            outline: 'none',
            zIndex: '1000',
        });

        document.body.appendChild(this.nameInput);
        this.positionInput(cx, y);
        this.nameInput.focus();

        // Reposition on resize
        this.scale.on('resize', () => this.positionInput(cx, y));

        // Submit on Enter
        this.nameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.onSubmit();
        });
    }

    positionInput(cx, y) {
        const canvas = this.game.canvas;
        const rect = canvas.getBoundingClientRect();
        const scaleX = rect.width / this.scale.width;
        const scaleY = rect.height / this.scale.height;
        this.nameInput.style.left = `${rect.left + cx * scaleX - 112}px`;
        this.nameInput.style.top = `${rect.top + y * scaleY - 4}px`;
    }

    createRecentNameChips(cx, y) {
        const names = getRecentNames();
        if (names.length <= 1) return;

        this.add.text(cx, y, 'or pick a name:', {
            fontSize: '15px', fill: '#668899',
            resolution: this.dpr
        }).setOrigin(0.5).setDepth(1);

        const chipSpacing = 90;
        const chipStartX = cx - ((names.length - 1) * chipSpacing / 2);
        names.forEach((name, i) => {
            const chipX = chipStartX + i * chipSpacing;
            const chip = this.add.text(chipX, y + 24, name, {
                fontSize: '16px', fill: '#44aadd', backgroundColor: '#1a2a3a',
                padding: { x: 8, y: 4 },
                resolution: this.dpr
            }).setOrigin(0.5).setDepth(1).setInteractive({ useHandCursor: true });

            chip.on('pointerdown', () => {
                this.nameInput.value = name;
                this.onSubmit();
            });
            chip.on('pointerover', () => chip.setStyle({ fill: '#88ddff' }));
            chip.on('pointerout', () => chip.setStyle({ fill: '#44aadd' }));
        });
    }

    createButton(x, y, label, callback) {
        const btn = this.add.text(x, y, label, {
            fontSize: '24px', fill: '#ffffff', backgroundColor: '#226644',
            padding: { x: 20, y: 10 }, fontStyle: 'bold',
            stroke: '#000', strokeThickness: 1, resolution: this.dpr
        }).setOrigin(0.5).setDepth(1).setInteractive({ useHandCursor: true });

        btn.on('pointerover', () => btn.setStyle({ backgroundColor: '#33aa66' }));
        btn.on('pointerout', () => btn.setStyle({ backgroundColor: '#226644' }));
        btn.on('pointerdown', callback);
        return btn;
    }

    async onSubmit() {
        const name = this.nameInput.value.trim();
        if (!name) {
            this.nameInput.style.borderColor = '#ff4444';
            return;
        }

        // Disable submit
        this.submitBtn.disableInteractive();
        this.submitBtn.setText('SUBMITTING...');
        this.submitBtn.setStyle({ backgroundColor: '#333333' });

        saveRecentName(name);

        try {
            await submitScore(name, this.finalScore, this.playerFlag);
            const scores = await getTopScores(10);
            this.removeInput();
            this.showLeaderboard(scores, name);
        } catch (e) {
            console.warn('Score submit failed:', e);
            this.submitBtn.setText('FAILED - TAP TO RETRY');
            this.submitBtn.setStyle({ backgroundColor: '#883333' });
            this.submitBtn.setInteractive({ useHandCursor: true });
        }
    }

    removeInput() {
        if (this.nameInput && this.nameInput.parentNode) {
            this.nameInput.parentNode.removeChild(this.nameInput);
        }
        this.scale.off('resize');
    }

    showLeaderboard(scores, playerName) {
        // Clear the name-entry UI
        this.children.removeAll(true);

        const { width, height } = this.scale;
        const cx = width / 2;
        const dpr = this.dpr;

        // Background
        this.add.rectangle(cx, height / 2, width, height, 0x000000, 0.85).setDepth(0);

        // Title
        this.add.text(cx, 30, 'LEADERBOARD', {
            fontSize: '40px', fill: '#ffdd44', fontStyle: 'bold',
            stroke: '#000', strokeThickness: 3, resolution: dpr
        }).setOrigin(0.5).setDepth(1);

        // Your score reminder
        this.add.text(cx, 68, `Your score: ${this.finalScore}`, {
            fontSize: '20px', fill: '#88bbdd',
            stroke: '#000', strokeThickness: 1, resolution: dpr
        }).setOrigin(0.5).setDepth(1);

        // Table header
        const tableY = 100;
        const rowH = 36;
        const col = { rank: cx - 130, name: cx - 80, score: cx + 60, flag: cx + 130 };

        const headerStyle = { fontSize: '16px', fill: '#668899', fontStyle: 'bold', resolution: dpr };
        this.add.text(col.rank, tableY, '#', headerStyle).setOrigin(0.5).setDepth(1);
        this.add.text(col.name, tableY, 'NAME', headerStyle).setOrigin(0, 0.5).setDepth(1);
        this.add.text(col.score, tableY, 'SCORE', headerStyle).setOrigin(0.5).setDepth(1);
        this.add.text(col.flag, tableY, '', headerStyle).setOrigin(0.5).setDepth(1);

        // Divider line
        const g = this.add.graphics().setDepth(1);
        g.lineStyle(1, 0x335577, 0.6);
        g.lineBetween(cx - 150, tableY + 14, cx + 150, tableY + 14);

        // Rows
        scores.forEach((entry, i) => {
            const y = tableY + 32 + i * rowH;
            const isPlayer = entry.name === playerName;
            const nameColor = isPlayer ? '#ffdd44' : '#ffffff';
            const scoreColor = isPlayer ? '#ffdd44' : '#aaddff';
            const rankColor = isPlayer ? '#ffdd44' : '#668899';

            // Highlight row background for player
            if (isPlayer) {
                this.add.rectangle(cx, y, 310, rowH - 4, 0xffdd44, 0.08)
                    .setOrigin(0.5).setDepth(1);
            }

            const rowStyle = (color) => ({
                fontSize: '19px', fill: color,
                fontStyle: isPlayer ? 'bold' : 'normal',
                stroke: '#000', strokeThickness: 1, resolution: dpr
            });

            this.add.text(col.rank, y, `${entry.rank}`, rowStyle(rankColor)).setOrigin(0.5).setDepth(2);
            this.add.text(col.name, y, entry.name, rowStyle(nameColor)).setOrigin(0, 0.5).setDepth(2);
            this.add.text(col.score, y, `${entry.score}`, rowStyle(scoreColor)).setOrigin(0.5).setDepth(2);
            this.add.text(col.flag, y, entry.flag, { fontSize: '22px', resolution: dpr }).setOrigin(0.5).setDepth(2);
        });

        if (scores.length === 0) {
            this.add.text(cx, tableY + 60, 'No scores yet - you could be first!', {
                fontSize: '18px', fill: '#668899', resolution: dpr
            }).setOrigin(0.5).setDepth(1);
        }

        // Play Again button
        const btnY = Math.min(tableY + 44 + scores.length * rowH + 20, height - 50);
        this.createButton(cx, btnY, 'PLAY AGAIN', () => {
            this.scene.stop();
            this.scene.get('Game').scene.restart();
        });
    }

    shutdown() {
        this.removeInput();
    }

    destroy() {
        this.removeInput();
    }
}
