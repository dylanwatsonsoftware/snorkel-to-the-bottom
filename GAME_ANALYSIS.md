# Game Analysis: Snorkel to the Bottom

## Current Mechanics

### Movement
*   **Surface:** The player starts on a boat at the surface (above 300px). Movement is restricted to horizontal (left/right), and the boat's velocity is synchronized with the player's movement.
*   **Diving:** Moving below 300px transitions the player to a swimming state. Underwater movement is 8-directional at a constant speed of **200 units**.
*   **Controls:** Supports standard arrow keys (keyboard) and a virtual joystick (mobile).

### Survival & Health
*   **Air Supply:** A limited tank (100 units) that depletes by **2 units per second** while submerged. Air is automatically replenished when the player returns to the surface.
*   **Air Replenishment:** Collectible **Air Bubbles** provide +5 units, while **Scuba Tanks** fully restore the air supply. Running out of air triggers a Game Over.
*   **Health System:** The player has **3 hearts**. Contact with enemies (Pirates) reduces health by 1.
*   **Invincibility:** Taking damage triggers a "flicker" effect and temporary invincibility lasting approximately **2 seconds** (10 repetitions of a 100ms tween).

### Combat
*   **Sword Sweep:** The player can perform a sword swing (Space or Fire button). The sword follows a wide arc animation over **250ms** using a `Back.out` easing function to create a snappy, mechanical feel.
*   **Hitbox:** The sword has a dedicated physics body that overlaps with enemies to destroy them.

### Progression
*   **Collectibles:** The game tracks **Money** (from Treasures/Mermaids), **Crystals** (rare finds), and **Score**.
*   **Depth:** Depth is calculated based on the Y-coordinate below the surface (1m per 10px).
*   **Scaling Difficulty:** A difficulty multiplier increases by **0.0001 every frame**, directly influencing the horizontal speed of spawned pirates.

## Current Visual Elements

### Environment
*   **Two-Tone World:** The world is visually divided into a light blue sky (`0x87ceeb`) and a dark blue ocean (`0x004488`).
*   **Dynamic Camera:** The camera smoothly follows the player using a linear interpolation (lerp) of **0.1**, providing a slight delay that enhances the feeling of weight and fluid movement.

### Player Visuals
*   **Procedural Animation:** While swimming, a procedural sine-wave wobble is applied to the player's rotation (`Math.sin(time / 150) * 10`), simulating the oscillating motion of a diver.
*   **Directional Flipping:** The player sprite flips horizontally based on the movement direction to maintain visual consistency.
*   **Combat Effects:** The sword sweep is visually represented by a tweened arc, and taking damage triggers a transparency-based "flicker" effect.

### User Interface (UI)
*   **HUD:** A text-based heads-up display provides real-time feedback on Air, Score, Money, Crystals, and Depth.
*   **Visual Health:** Player health is represented using emoji heart icons (❤️), which are updated dynamically.
*   **Mobile Controls:** Semi-transparent virtual controls are implemented for mobile play, including a joystick for movement and a dedicated 'FIRE' button.

## Suggested Improvements

### Dave the Diver Inspired Concepts
*   **Weight & Encumbrance System:** Implement a system where carrying more treasure and crystals increases the player's "Weight". High weight should slow down swimming speed and increase air consumption, forcing a strategic trade-off between staying down longer and returning to the surface to "bank" loot.
*   **Surface Upgrade Shop:** Use the boat as a "base" where money and crystals can be spent on permanent upgrades:
    *   **Air Tanks:** Increase maximum air capacity.
    *   **Fins:** Increase base swimming speed.
    *   **Weapon Upgrades:** Increase sword reach or damage.
*   **Harpoon Mechanic:** Add an aimable harpoon projectile (controlled by mouse/joystick direction). This would allow for ranged combat and introduce skill-based "hunting" of specific sea life.
*   **Oxygen as Health:** Consider merging the Health and Air systems. In *Dave the Diver*, taking damage reduces your oxygen supply directly, making every collision a double threat to your dive time.

### Mechanic Improvements
*   **Dash/Sprint:** Allow the player to consume air quickly for a short burst of speed. This adds a "risk vs. reward" escape mechanism.
*   **Banking Mechanic:** Require the player to touch the boat at the surface to "save" their collected money and crystals. This increases the tension of deep-sea exploration.
*   **Diverse Enemy Behavior:** Instead of pirates only moving horizontally, introduce aggressive enemies (e.g., sharks) that track the player and passive fish that can be harvested for resources.

### Visual & Polish Enhancements
*   **Parallax Backgrounds:** Add multiple background layers (distant seaweed, rock formations, bubbles, silhouettes of large sea creatures) moving at different speeds to create a greater sense of depth and immersion.
*   **Depth-Based Lighting:** Implement a "lighting" system where the screen gets progressively darker as the player dives deeper. This could lead to a "Flashlight" upgrade mechanic.
*   **Particle Effects:**
    *   **Bubbles:** Emit small bubble particles from the player's snorkel while moving and diving.
    *   **Combat Feedback:** Add "hit" sparks when the sword strikes an enemy and a "poof" of bubbles when an enemy is defeated.
*   **Screen Shake:** Add a subtle screen shake when the player takes damage or defeats a major enemy to improve the "impact" of combat.
*   **Enhanced HUD:** Replace text-based percentages and counts with visual bars (e.g., a blue bar for air) and stylized icons for a more professional look.
