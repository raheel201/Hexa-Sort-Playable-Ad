import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import * as TWEEN from '@tweenjs/tween.js';
import { ASSETS, COLORS, TOWER_CONFIG } from './Constants.js';

export class ThreeEngine {
    constructor() {
        this.scene = new THREE.Scene();
        this.scene.background = null;

        this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 6, 9);
        this.camera.lookAt(0, 3, 0);

        this.renderer = new THREE.WebGLRenderer({ 
            canvas: document.getElementById('three-canvas'), 
            antialias: true,
            alpha: true 
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x000000, 0);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(-5, 10, 5);
        this.scene.add(dirLight);

        this.raycaster = new THREE.Raycaster();
        this.pointer = new THREE.Vector2();
        this.isDragging = false;
        this.lastPointerX = 0;
        this.selectedRow = -1;

        this.models = {};
        this.rowGroups = []; // Each row can rotate independently
        this.fixedEmptyColumns = []; // Fixed empty columns facing camera
        this.score = 0;
        
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
        // Base model - cream colored
        const baseGeo = new THREE.CylinderGeometry(2.5, 2.8, 0.3, 16);
        const baseMat = new THREE.MeshStandardMaterial({ color: 0xF5E6D3 });
        this.models['base'] = new THREE.Mesh(baseGeo, baseMat);

        // Circle shelf model - cream colored and thinner
        const circleGeo = new THREE.CylinderGeometry(2.4, 2.4, 0.08, 16);
        const circleMat = new THREE.MeshStandardMaterial({ color: 0xF5E6D3 });
        this.models['circle'] = new THREE.Mesh(circleGeo, circleMat);

        // Hexa tile model - 50% smaller
        const hexaGeo = new THREE.CylinderGeometry(0.125, 0.125, 0.075, 12);
        const hexaMat = new THREE.MeshStandardMaterial({ color: 0xFF0000 });
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
            this.rowGroups[row].add(shelf);
            
            // Add hexagon columns around the shelf
            this.createRowColumns(row);
        }
        
        // Add shadow (with fallback)
        const shadowGeo = new THREE.PlaneGeometry(8, 8);
        let shadowMat;
        
        if (this.shadowTexture) {
            shadowMat = new THREE.MeshBasicMaterial({ 
                map: this.shadowTexture, 
                transparent: true, 
                opacity: 0.4 
            });
        } else {
            // Fallback: simple dark circle shadow
            shadowMat = new THREE.MeshBasicMaterial({ 
                color: 0x000000, 
                transparent: true, 
                opacity: 0.2 
            });
        }
        
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
        tile.traverse((child) => {
            if (child.isMesh) {
                child.material = new THREE.MeshStandardMaterial({
                    color: color,
                    roughness: 0.3,
                    metalness: 0.1
                });
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
        
        // Animate hexagons falling to empty column
        hexagons.forEach((hex, i) => {
            const worldPos = new THREE.Vector3();
            hex.getWorldPosition(worldPos);
            
            const newHex = hex.clone();
            newHex.position.copy(worldPos);
            this.scene.add(newHex);
            
            const targetPos = new THREE.Vector3();
            targetEmptyColumn.getWorldPosition(targetPos);
            targetPos.y = targetRow * TOWER_CONFIG.LEVEL_HEIGHT + i * 0.18;
            
            new TWEEN.Tween(newHex.position)
                .to({ x: targetPos.x, y: targetPos.y, z: targetPos.z }, 600)
                .delay(i * 50)
                .onComplete(() => {
                    this.scene.remove(newHex);
                    targetEmptyColumn.add(newHex);
                    newHex.position.set(0, i * 0.18, 0);
                })
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
        setTimeout(() => this.checkRowEmptyColumnMatches(), 700);
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
                // Clear all stacks of this color
                colorCounts[color].forEach(({ column }) => {
                    column.userData.hexagons.forEach(hex => column.remove(hex));
                    column.userData.hexagons = [];
                    column.userData.color = null;
                });
                
                this.score += 1000;
                window.dispatchEvent(new CustomEvent('scoreUpdate', { detail: this.score }));
                break;
            }
        }
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
        
        // Smooth row rotations
        this.rowGroups.forEach(row => {
            row.rotation.y = THREE.MathUtils.lerp(
                row.rotation.y,
                row.userData.targetRotation,
                0.1
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