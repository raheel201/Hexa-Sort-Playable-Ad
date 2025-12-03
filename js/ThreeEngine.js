import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import * as TWEEN from '@tweenjs/tween.js';
import { ASSETS, COLORS, TOWER_CONFIG } from './Constants.js';

export class ThreeEngine {
    constructor() {
        this.scene = new THREE.Scene();
        this.scene.background = null;
        this.scene.fog = new THREE.Fog(0x000000, 50, 100);

        this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 6, 9);
        this.camera.lookAt(0, 3, 0);

        this.renderer = new THREE.WebGLRenderer({ 
            canvas: document.getElementById('three-canvas'), 
            antialias: true,
            alpha: true,
            shadowMap: { enabled: true, type: THREE.PCFShadowShadowMap }
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x000000, 0);
        this.renderer.shadowMap.enabled = true;
        this.renderer.toneMappingExposure = 1.2;

        // Enhanced lighting setup
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);
        
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
        dirLight.position.set(-8, 12, 8);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.camera.far = 30;
        dirLight.shadow.camera.left = -15;
        dirLight.shadow.camera.right = 15;
        dirLight.shadow.camera.top = 15;
        dirLight.shadow.camera.bottom = -15;
        this.scene.add(dirLight);
        
        // Point light for accent
        const pointLight = new THREE.PointLight(0x4488ff, 0.6, 30);
        pointLight.position.set(5, 8, 5);
        this.scene.add(pointLight);

        this.raycaster = new THREE.Raycaster();
        this.pointer = new THREE.Vector2();
        this.isDragging = false;
        this.lastPointerX = 0;
        this.selectedRow = -1;

        this.models = {};
        this.rowGroups = []; // Each row can rotate independently
        this.fixedEmptyColumns = []; // Fixed empty columns facing camera
        this.score = 0;
        this.particleSystems = [];
        
        window.addEventListener('resize', () => this.onWindowResize(), false);
    }

    loadAssets(onComplete) {
        const manager = new THREE.LoadingManager();
        manager.onLoad = () => {
            document.getElementById('loader').style.display = 'none';
            onComplete();
        };

        const texLoader = new THREE.TextureLoader(manager);

        // Skip shadow texture loading - use fallback only
        this.shadowTexture = null;

        // Create basic models first
        this.createBasicModels();
        
        // Load FBX model
        const fbxLoader = new FBXLoader(manager);
        fbxLoader.load(ASSETS.hexa, (fbx) => {
            fbx.scale.setScalar(0.003);
            this.models['hexa'] = fbx;
            console.log('FBX hexa model loaded successfully');
        }, undefined, (error) => {
            console.warn('FBX hexa model failed to load:', error);
            console.log('Using fallback basic hexa model');
        });
    }

    createBasicModels() {
        // Base model - cream colored with better material
        const baseGeo = new THREE.CylinderGeometry(2.5, 2.8, 0.3, 16);
        const baseMat = new THREE.MeshStandardMaterial({ 
            color: 0xF5E6D3,
            roughness: 0.4,
            metalness: 0.2,
            emissive: 0x1a1a1a
        });
        baseMat.castShadow = true;
        baseMat.receiveShadow = true;
        this.models['base'] = new THREE.Mesh(baseGeo, baseMat);

        // Circle shelf model - cream colored with glossy material
        const circleGeo = new THREE.CylinderGeometry(2.4, 2.4, 0.08, 16);
        const circleMat = new THREE.MeshStandardMaterial({ 
            color: 0xF5E6D3,
            roughness: 0.3,
            metalness: 0.3,
            emissive: 0x0d0d0d
        });
        circleMat.castShadow = true;
        circleMat.receiveShadow = true;
        this.models['circle'] = new THREE.Mesh(circleGeo, circleMat);

        // Hexa tile model - 50% smaller with enhanced material
        const hexaGeo = new THREE.CylinderGeometry(0.125, 0.125, 0.075, 12);
        const hexaMat = new THREE.MeshStandardMaterial({ 
            color: 0xFF0000,
            roughness: 0.4,
            metalness: 0.6,
            emissive: 0x330000
        });
        hexaMat.castShadow = true;
        hexaMat.receiveShadow = true;
        this.models['hexa'] = new THREE.Mesh(hexaGeo, hexaMat);
    }

    initRows() {
        // Create 10 independent row groups
        for (let row = 0; row < TOWER_CONFIG.LEVELS; row++) {
            const rowGroup = new THREE.Group();
            rowGroup.position.y = row * TOWER_CONFIG.LEVEL_HEIGHT;
            rowGroup.userData = { row: row, targetRotation: 0 };
            this.scene.add(rowGroup);
            this.rowGroups.push(rowGroup);
        }
    }

    buildTower() {
        this.initRows();
        this.createFixedDropColumn();
        
        // Add shelves and hexagon columns to each row
        for (let row = 0; row < TOWER_CONFIG.LEVELS; row++) {
            // Add cream-colored shelf
            const shelf = this.models['circle'].clone();
            shelf.castShadow = true;
            shelf.receiveShadow = true;
            this.rowGroups[row].add(shelf);
            
            // Add hexagon columns around the shelf
            this.createRowColumns(row);
        }
        
        // Add subtle enhanced shadow with gradient effect
        const shadowGeo = new THREE.PlaneGeometry(8, 8);
        const shadowCanvas = document.createElement('canvas');
        shadowCanvas.width = 256;
        shadowCanvas.height = 256;
        const ctx = shadowCanvas.getContext('2d');
        
        // Create radial gradient shadow - more subtle
        const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 180);
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0.25)');
        gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.1)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 256, 256);
        
        const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
        const shadowMat = new THREE.MeshBasicMaterial({ 
            map: shadowTexture, 
            transparent: true, 
            opacity: 0.25,
            depthWrite: false
        });
        
        const shadow = new THREE.Mesh(shadowGeo, shadowMat);
        shadow.rotation.x = -Math.PI / 2;
        shadow.position.y = -0.5;
        this.scene.add(shadow);
    }

    createFixedDropColumn() {
        // Empty columns are now part of each row and will rotate with them
        this.fixedEmptyColumns = [];
    }
    
    createRowColumns(row) {
        const colors = Object.values(COLORS);
        
        for (let col = 0; col < TOWER_CONFIG.COLUMNS; col++) {
            const angle = (col * TOWER_CONFIG.COLUMN_ANGLE - 270) * Math.PI / 180;
            const x = Math.cos(angle) * TOWER_CONFIG.RADIUS;
            const z = Math.sin(angle) * TOWER_CONFIG.RADIUS;
            
            const columnGroup = new THREE.Group();
            columnGroup.position.set(x, 0, z);
            columnGroup.userData = { column: col, color: null, hexagons: [] };
            
            // Skip column 0 (front-facing) - leave it empty
            if (col !== 0) {
                const stackHeight = 4;
                const color = colors[Math.floor(Math.random() * colors.length)];
                columnGroup.userData.color = color;
                
                for (let h = 0; h < stackHeight; h++) {
                    const hex = this.createHexTile(color);
                    hex.position.y = h * 0.18;
                    columnGroup.add(hex);
                    columnGroup.userData.hexagons.push(hex);
                }
            }
            
            this.rowGroups[row].add(columnGroup);
        }
    }

    createHexTile(color) {
        const tile = this.models['hexa'].clone();
        tile.castShadow = true;
        tile.receiveShadow = true;
        tile.traverse((child) => {
            if (child.isMesh) {
                child.material = new THREE.MeshStandardMaterial({
                    color: color,
                    roughness: 0.4,
                    metalness: 0.6,
                    emissive: new THREE.Color(color).multiplyScalar(0.2)
                });
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        tile.userData = { color: color };
        return tile;
    }

    getFrontColumnIndex(row) {
        const currentRotation = row.rotation.y;
        const normalizedRotation = ((currentRotation % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        const anglePerColumn = TOWER_CONFIG.COLUMN_ANGLE * Math.PI / 180;
        return Math.round(normalizedRotation / anglePerColumn) % TOWER_CONFIG.COLUMNS;
    }



    handleInput(x, y, isDown, type) {
        this.pointer.x = (x / window.innerWidth) * 2 - 1;
        this.pointer.y = -(y / window.innerHeight) * 2 + 1;

        if (type === 'down') {
            this.isDragging = true;
            this.lastPointerX = x;
            
            // Detect which row was clicked
            this.raycaster.setFromCamera(this.pointer, this.camera);
            const intersects = this.raycaster.intersectObjects(this.scene.children, true);
            
            for (const intersect of intersects) {
                let obj = intersect.object;
                while (obj.parent && obj.parent !== this.scene) {
                    obj = obj.parent;
                    if (this.rowGroups.includes(obj)) {
                        this.selectedRow = this.rowGroups.indexOf(obj);
                        break;
                    }
                }
                if (this.selectedRow !== -1) break;
            }
        } else if (type === 'move' && this.isDragging && this.selectedRow !== -1) {
            const deltaX = x - this.lastPointerX;
            this.rowGroups[this.selectedRow].userData.targetRotation += deltaX * 0.01;
            this.lastPointerX = x;
        } else if (type === 'up') {
            if (this.selectedRow !== -1) {
                this.checkEmptyColumnFill(this.selectedRow);
                this.selectedRow = -1;
            }
            this.isDragging = false;
        }
    }



    checkEmptyColumnFill(rowIndex) {
        const row = this.rowGroups[rowIndex];
        const columns = row.children.filter(child => child.userData.column !== undefined);
        
        // Check which column is aligned with front position (0 degrees)
        const currentRotation = row.rotation.y;
        const normalizedRotation = ((currentRotation % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        
        // Calculate which column index is closest to front position
        const anglePerColumn = TOWER_CONFIG.COLUMN_ANGLE * Math.PI / 180;
        const frontColumnIndex = Math.round(normalizedRotation / anglePerColumn) % TOWER_CONFIG.COLUMNS;
        
        // Find the column that's now at the front
        const frontColumn = columns.find(col => col.userData.column === frontColumnIndex);
        
        // Only allow dropping from non-empty columns (not column 0)
        if (frontColumn && frontColumn.userData.column !== 0 && frontColumn.userData.hexagons.length > 0) {
            const alignmentThreshold = 0.2; // Radians tolerance
            const expectedAngle = frontColumnIndex * anglePerColumn;
            const angleDiff = Math.abs(normalizedRotation - expectedAngle);
            
            if (angleDiff < alignmentThreshold || angleDiff > (Math.PI * 2 - alignmentThreshold)) {
                this.dropStackToFixedEmptyColumn(frontColumn, rowIndex);
            }
        }
    }
    
    dropStackToFixedEmptyColumn(sourceColumn, rowIndex) {
        const hexagons = sourceColumn.userData.hexagons;
        const color = sourceColumn.userData.color;
        
        // Find the lowest row where the front-facing column is empty
        let targetRow = -1;
        for (let r = 0; r <= rowIndex; r++) {
            const row = this.rowGroups[r];
            const frontColumnIndex = this.getFrontColumnIndex(row);
            const frontColumn = row.children.find(child => child.userData.column === frontColumnIndex);
            if (frontColumn && frontColumn.userData.hexagons.length === 0) {
                targetRow = r;
                break;
            }
        }
        
        // If no front-facing empty column found, don't drop
        if (targetRow === -1) return;
        
        const targetRowGroup = this.rowGroups[targetRow];
        const frontColumnIndex = this.getFrontColumnIndex(targetRowGroup);
        const targetEmptyColumn = targetRowGroup.children.find(child => child.userData.column === frontColumnIndex);
        
        // Animate hexagons falling to empty column with enhanced effects
        hexagons.forEach((hex, i) => {
            const worldPos = new THREE.Vector3();
            hex.getWorldPosition(worldPos);
            
            const newHex = hex.clone();
            newHex.position.copy(worldPos);
            newHex.castShadow = true;
            newHex.receiveShadow = true;
            this.scene.add(newHex);
            
            const targetPos = new THREE.Vector3();
            targetEmptyColumn.getWorldPosition(targetPos);
            targetPos.y = targetRow * TOWER_CONFIG.LEVEL_HEIGHT + i * 0.18;
            
            // Enhanced animation with rotation and scale
            new TWEEN.Tween(newHex.position)
                .to({ x: targetPos.x, y: targetPos.y, z: targetPos.z }, 700 + i * 100)
                .easing(TWEEN.Easing.Cubic.Out)
                .delay(i * 50)
                .onComplete(() => {
                    this.scene.remove(newHex);
                    targetEmptyColumn.add(newHex);
                    newHex.position.set(0, i * 0.18, 0);
                    this.createParticleEffect(targetPos, color);
                })
                .start();
            
            // Add rotation animation
            new TWEEN.Tween(newHex.rotation)
                .to({ x: newHex.rotation.x + Math.PI, z: newHex.rotation.z + Math.PI }, 700 + i * 100)
                .easing(TWEEN.Easing.Cubic.Out)
                .delay(i * 50)
                .start();
        });
        
        // Update target empty column
        targetEmptyColumn.userData.hexagons = [...hexagons];
        targetEmptyColumn.userData.color = color;
        
        // Clear source column
        sourceColumn.userData.hexagons.forEach(hex => sourceColumn.remove(hex));
        sourceColumn.userData.hexagons = [];
        sourceColumn.userData.color = null;
        
        // Check for matches after animation
        setTimeout(() => this.checkRowEmptyColumnMatches(), 850);
    }
    
    checkRowEmptyColumnMatches() {
        // Check individual front-facing columns for same color
        this.checkFrontColumnSameColor();
        
        // Count same color hexagons in currently front-facing columns
        const colorCounts = {};
        
        for (let r = 0; r < TOWER_CONFIG.LEVELS; r++) {
            const row = this.rowGroups[r];
            const frontColumnIndex = this.getFrontColumnIndex(row);
            const frontCol = row.children.find(child => child.userData.column === frontColumnIndex);
            if (frontCol && frontCol.userData.color) {
                const color = frontCol.userData.color;
                if (!colorCounts[color]) colorCounts[color] = [];
                colorCounts[color].push({ row: r, column: frontCol });
            }
        }
        
        // Check if any color has 6 stacks (complete tower)
        for (const color in colorCounts) {
            if (colorCounts[color].length >= 6) {
                // Animate and clear all stacks of this color
                colorCounts[color].forEach(({ column }, idx) => {
                    setTimeout(() => {
                        this.clearColumnWithEffect(column, color);
                    }, idx * 100);
                });
                
                this.score += 1000;
                window.dispatchEvent(new CustomEvent('scoreUpdate', { detail: this.score }));
                break;
            }
        }
    }
    
    clearColumnWithEffect(column, color) {
        const hexagons = column.userData.hexagons;
        hexagons.forEach((hex, i) => {
            const worldPos = new THREE.Vector3();
            hex.getWorldPosition(worldPos);
            this.createParticleEffect(worldPos, color);
            
            // Animate hex disappearing
            new TWEEN.Tween(hex.scale)
                .to({ x: 0, y: 0, z: 0 }, 400)
                .easing(TWEEN.Easing.Back.In)
                .delay(i * 50)
                .start();
        });
        
        setTimeout(() => {
            column.userData.hexagons.forEach(hex => column.remove(hex));
            column.userData.hexagons = [];
            column.userData.color = null;
        }, 400 + hexagons.length * 50);
    }
    
    createParticleEffect(position, color) {
        const particleCount = 12;
        const geometry = new THREE.BufferGeometry();
        const positions = [];
        const colors = [];
        const velocities = [];
        
        const colorObj = new THREE.Color(color);
        
        for (let i = 0; i < particleCount; i++) {
            positions.push(position.x, position.y, position.z);
            colors.push(colorObj.r, colorObj.g, colorObj.b);
            
            const angle = (Math.PI * 2 * i) / particleCount;
            const speed = 1 + Math.random() * 2;
            velocities.push(
                Math.cos(angle) * speed,
                0.5 + Math.random() * 2,
                Math.sin(angle) * speed
            );
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3));
        
        const material = new THREE.PointsMaterial({
            size: 0.1,
            vertexColors: true,
            transparent: true,
            opacity: 0.8
        });
        
        const particles = new THREE.Points(geometry, material);
        this.scene.add(particles);
        
        const particleData = {
            particles: particles,
            velocities: velocities,
            age: 0,
            life: 1000
        };
        
        this.particleSystems.push(particleData);
    }
    
    checkFrontColumnSameColor() {
        const frontColors = [];
        
        // Collect colors from all front-facing columns
        for (let r = 0; r < TOWER_CONFIG.LEVELS; r++) {
            const row = this.rowGroups[r];
            const frontColumnIndex = this.getFrontColumnIndex(row);
            const frontCol = row.children.find(child => child.userData.column === frontColumnIndex);
            
            if (frontCol && frontCol.userData.hexagons.length > 0) {
                frontColors.push(frontCol.userData.color);
            }
        }
        
        // Check if all 6 rows have the same color in front position
        if (frontColors.length === 5 && frontColors.every(color => color === frontColors[0])) {
            this.score += 500;
            window.dispatchEvent(new CustomEvent('scoreUpdate', { detail: this.score }));
        }
    }





    

    

    


    update() {
        TWEEN.update();
        
        // Update particle systems
        for (let i = this.particleSystems.length - 1; i >= 0; i--) {
            const particleData = this.particleSystems[i];
            particleData.age += 16; // Approximate frame time
            
            const positions = particleData.particles.geometry.attributes.position.array;
            const velocities = particleData.velocities;
            
            for (let j = 0; j < positions.length; j += 3) {
                positions[j] += velocities[j] * 0.01;
                positions[j + 1] += velocities[j + 1] * 0.01;
                positions[j + 2] += velocities[j + 2] * 0.01;
                velocities[j + 1] -= 0.05; // Gravity
            }
            
            particleData.particles.geometry.attributes.position.needsUpdate = true;
            
            // Fade out
            const progress = particleData.age / particleData.life;
            particleData.particles.material.opacity = 0.8 * (1 - progress);
            
            if (particleData.age >= particleData.life) {
                this.scene.remove(particleData.particles);
                this.particleSystems.splice(i, 1);
            }
        }
        
        // Smooth row rotations
        this.rowGroups.forEach(row => {
            row.rotation.y = THREE.MathUtils.lerp(
                row.rotation.y,
                row.userData.targetRotation,
                0.12
            );
        });
        
        this.renderer.render(this.scene, this.camera);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}