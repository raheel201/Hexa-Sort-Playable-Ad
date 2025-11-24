# Hexa Sort Playable Ad

A 3D playable advertisement for the "Hexa Sort" mobile game, built with Three.js and Phaser.

## Features Implemented

### ✅ Asset Loading & Scene Setup
- **FBX Models**: Shelf_Base.fbx, Shelf_Circle.fbx (×4 stacked), hexa_03.fbx
- **Textures**: wood2_01.png (CSS background), shadow_01.png (ground shadow)
- **Loading Manager**: Ensures all assets load before game starts
- **Scale Normalization**: Auto-scales FBX models to consistent sizes

### ✅ Tower Construction
- **Base**: Single Shelf_Base.fbx at bottom center
- **4-Level Tower**: Shelf_Circle.fbx cloned and stacked vertically
- **8 Radial Columns**: 360°/8 = 45° spacing around each circle
- **Tower Group**: All shelves grouped for unified rotation

### ✅ Game Mechanics
- **Tile Stacking**: Hexa tiles stack vertically in columns
- **Color System**: 5 colors (Red, Blue, Yellow, Green, Purple)
- **Column Selection**: Raycast-based tap detection with invisible hitboxes
- **Stack Movement**: Move matching color groups between adjacent columns
- **Merge Logic**: Stacks of 8+ tiles disappear with animation
- **Tower Rotation**: Smooth swipe-to-rotate mechanics

### ✅ Animations & Effects
- **Flying Tiles**: TWEEN.js parabolic arcs for tile movement
- **Smooth Rotation**: Interpolated tower spinning
- **Particle Effects**: Scale-to-zero animation for cleared stacks
- **Feedback**: "GOOD MOVE!" and "PERFECT!" text animations

### ✅ UI & Tutorial
- **Hand Tutorial**: Animated instruction text on first load
- **Score Display**: Move counter and merge progress (0/3)
- **End Card**: CTA overlay after 3 successful merges
- **Mobile Optimized**: Portrait mode, touch-friendly controls

### ✅ Technical Implementation
- **Modular ES6**: Clean separation of concerns
- **Three.js + Phaser**: 3D rendering with 2D UI overlay
- **Performance**: Fake shadows instead of real-time shadow maps
- **Cross-Platform**: Works on mobile and desktop browsers

## File Structure
```
HexaSortAd/
├── assets/
│   ├── Shelf_Base.fbx
│   ├── Shelf_Circle.fbx  
│   ├── hexa_03.fbx
│   ├── wood2_01.png
│   └── shadow_01.png
├── css/
│   └── style.css
├── js/
│   ├── Constants.js      # Game configuration
│   ├── ThreeEngine.js    # 3D scene management
│   ├── MainScene.js      # Phaser game logic
│   └── main.js          # Entry point
└── index.html           # Main HTML file
```

## How to Play
1. **Tap** a column to select the top matching color stack
2. **Swipe** horizontally to rotate the tower
3. **Place** stacks on adjacent empty slots or matching colors
4. **Merge** stacks of 8+ tiles to clear them
5. **Complete** 3 merges to see the install prompt

## Browser Compatibility
- Chrome/Safari (mobile & desktop)
- Requires WebGL support
- Optimized for portrait orientation

## Performance Notes
- Uses texture-based shadows (not real-time)
- Normalized model scaling for consistent performance
- Efficient raycasting with simplified hitboxes
- TWEEN.js for smooth 60fps animations