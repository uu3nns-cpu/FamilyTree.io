// ============================================================================
// CANVAS INTERACTIONS - Canvas interaction handling (Enhanced)
// ============================================================================

class CanvasInteractions {
    constructor(app) {
        this.app = app;
        this.isDragging = false;
        this.draggedPerson = null;
        this.startX = 0;
        this.startY = 0;
        this.isPanning = false;
        this.isSpacePressed = false;
        this.panStartX = 0;
        this.panStartY = 0;
        this.initialPanX = 0;
        this.initialPanY = 0;
        
        // Enhanced drag features
        this.snapPreview = null;
        this.dragShadow = null;
        this.collisionWarning = null;
        this.MIN_DISTANCE = 80; // Minimum distance between persons
        
        // Multi-select drag
        this.isMultiDragging = false;
        this.multiDragStart = { x: 0, y: 0 };
        this.multiDragInitialPositions = new Map();
        
        // Selection box
        this.isSelectionBoxActive = false;
        this.selectionBoxStart = { x: 0, y: 0 };
        this.selectionBoxEnd = { x: 0, y: 0 };
        this.selectionBox = null;
        this.justFinishedSelectionBox = false;
    }

    setup() {
        const svg = document.getElementById('canvas');

        // Canvas click - deselect (but not when ending selection box)
        svg.addEventListener('click', (e) => {
            // Don't deselect if we just finished a selection box drag
            if (this.justFinishedSelectionBox) {
                this.justFinishedSelectionBox = false;
                return;
            }
            
            if (e.target === svg || e.target.id === 'main-group') {
                this.app.selectionManager.deselectAll();
                this.clearMultiSelection();
            }
        });

        // Space key - pan mode
        this.setupSpaceKey(svg);

        // Mouse events for drag and pan
        this.setupMouseEvents(svg);

        // Node selection
        this.setupNodeSelection(svg);

        // Context menu
        this.setupContextMenu(svg);

        // Mouse wheel zoom
        this.setupWheelZoom(svg);

        // Create drag enhancement elements
        this.createDragEnhancements(svg);

        // Setup keyboard shortcuts
        this.setupKeyboardShortcuts();
    }
    
    createDragEnhancements(svg) {
        // Create snap preview circle
        this.snapPreview = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        this.snapPreview.setAttribute('class', 'snap-preview');
        this.snapPreview.setAttribute('r', '30');
        this.snapPreview.setAttribute('fill', 'none');
        this.snapPreview.setAttribute('stroke', '#2196F3');
        this.snapPreview.setAttribute('stroke-width', '2');
        this.snapPreview.setAttribute('stroke-dasharray', '5,5');
        this.snapPreview.setAttribute('opacity', '0');
        this.snapPreview.style.pointerEvents = 'none';
        
        // Create drag shadow
        this.dragShadow = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        this.dragShadow.setAttribute('class', 'drag-shadow');
        this.dragShadow.setAttribute('opacity', '0');
        this.dragShadow.style.pointerEvents = 'none';
        
        // Create collision warning
        this.collisionWarning = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        this.collisionWarning.setAttribute('class', 'collision-warning');
        this.collisionWarning.setAttribute('r', '35');
        this.collisionWarning.setAttribute('fill', 'none');
        this.collisionWarning.setAttribute('stroke', '#FF5722');
        this.collisionWarning.setAttribute('stroke-width', '3');
        this.collisionWarning.setAttribute('opacity', '0');
        this.collisionWarning.style.pointerEvents = 'none';
        
        // Create selection box - Add to SVG directly for proper coordinate system
        this.selectionBox = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        this.selectionBox.setAttribute('class', 'selection-box');
        this.selectionBox.setAttribute('fill', 'rgba(59, 130, 246, 0.1)');
        this.selectionBox.setAttribute('stroke', '#3b82f6');
        this.selectionBox.setAttribute('stroke-width', '2');
        this.selectionBox.setAttribute('stroke-dasharray', '5,5');
        this.selectionBox.setAttribute('display', 'none');
        this.selectionBox.style.pointerEvents = 'none';
        this.selectionBox.style.vectorEffect = 'non-scaling-stroke'; // Keep stroke width constant
        
        // Add to main group
        const mainGroup = svg.querySelector('#main-group');
        if (mainGroup) {
            mainGroup.appendChild(this.snapPreview);
            mainGroup.appendChild(this.dragShadow);
            mainGroup.appendChild(this.collisionWarning);
            // Add selection box to main group for coordinate consistency
            mainGroup.appendChild(this.selectionBox);
        }
    }

    setupSpaceKey(svg) {
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && !this.isSpacePressed && !e.repeat) {
                this.isSpacePressed = true;
                svg.style.cursor = 'grab';
                if (this.app.renderer) {
                    this.app.renderer.disableAutoCenter = true;
                }
                e.preventDefault();
            }
        });

        document.addEventListener('keyup', (e) => {
            if (e.code === 'Space') {
                this.isSpacePressed = false;
                this.isPanning = false;
                svg.style.cursor = '';
                if (this.app.renderer) {
                    this.app.renderer.disableAutoCenter = false;
                }
            }
        });
    }

    setupMouseEvents(svg) {
        svg.addEventListener('mousedown', (e) => this.onMouseDown(e, svg));
        svg.addEventListener('mousemove', (e) => this.onMouseMove(e));
        svg.addEventListener('mouseup', () => this.onMouseUp(svg));
        svg.addEventListener('mouseleave', () => this.onMouseLeave(svg));
    }

    onMouseDown(e, svg) {
        // Pan mode with space key
        if (this.isSpacePressed) {
            this.isPanning = true;
            this.panStartX = e.clientX;
            this.panStartY = e.clientY;
            this.initialPanX = this.app.renderer.panX;
            this.initialPanY = this.app.renderer.panY;
            svg.style.cursor = 'grabbing';
            e.preventDefault();
            return;
        }

        // Node drag
        const node = e.target.closest('.genogram-node');
        if (node) {
            const personId = node.dataset.id;
            const person = this.app.state.findPerson(personId);
            
            // Check if clicking on a multi-selected node
            if (this.multiSelectedIds.has(personId)) {
                // Start multi-drag
                this.isMultiDragging = true;
                const point = this.getSVGPoint(e);
                this.multiDragStart = { x: point.x, y: point.y };
                
                // Store initial positions
                this.multiDragInitialPositions.clear();
                this.multiSelectedIds.forEach(id => {
                    const p = this.app.state.findPerson(id);
                    if (p) {
                        this.multiDragInitialPositions.set(id, { x: p.x, y: p.y });
                    }
                });
                
                // Add dragging class
                this.multiSelectedIds.forEach(id => {
                    const n = document.querySelector(`[data-id="${id}"]`);
                    if (n) n.classList.add('dragging');
                });
                
                e.preventDefault();
                return;
            }
            
            // Single node drag (when not multi-selected)
            if (!e.ctrlKey && !e.metaKey) {
                // Clear multi-selection if clicking on non-selected node
                this.clearMultiSelection();
            }
            
            this.isDragging = true;
            this.draggedPerson = person;
            
            if (this.draggedPerson) {
                this.startX = e.clientX - this.draggedPerson.x * this.app.renderer.currentZoom;
                this.startY = e.clientY - this.draggedPerson.y * this.app.renderer.currentZoom;
                node.classList.add('dragging');
                
                // Show drag shadow
                this.showDragShadow(this.draggedPerson);
            }
            return;
        }
        
        // Empty canvas click - start selection box
        if (e.target === svg || e.target.id === 'main-group') {
            console.log('Starting selection box');
            this.isSelectionBoxActive = true;
            const point = this.getSVGPoint(e);
            console.log('Start point:', point);
            this.selectionBoxStart = { x: point.x, y: point.y };
            this.selectionBoxEnd = { x: point.x, y: point.y };
            this.updateSelectionBox();
            this.selectionBox.setAttribute('display', 'block');
            console.log('Selection box display set to block');
            e.preventDefault();
        }
    }

    onMouseMove(e) {
        // Pan mode
        if (this.isPanning) {
            const dx = e.clientX - this.panStartX;
            const dy = e.clientY - this.panStartY;
            this.app.renderer.panX = this.initialPanX + dx;
            this.app.renderer.panY = this.initialPanY + dy;
            this.app.renderer.updateTransform();
            return;
        }
        
        // Selection box
        if (this.isSelectionBoxActive) {
            const point = this.getSVGPoint(e);
            this.selectionBoxEnd = { x: point.x, y: point.y };
            this.updateSelectionBox();
            console.log('Selection box updated:', this.selectionBoxEnd);
            return;
        }
        
        // Multi-drag
        if (this.isMultiDragging && this.multiDragInitialPositions.size > 0) {
            const point = this.getSVGPoint(e);
            const dx = point.x - this.multiDragStart.x;
            const dy = point.y - this.multiDragStart.y;
            
            this.multiSelectedIds.forEach(personId => {
                const person = this.app.state.findPerson(personId);
                const initial = this.multiDragInitialPositions.get(personId);
                if (person && initial) {
                    let newX = initial.x + dx;
                    let newY = initial.y + dy;
                    
                    // Apply magnet if enabled
                    if (this.app.state.isMagnetEnabled && this.app.renderer && this.app.renderer.gridSpacing) {
                        const spacing = this.app.renderer.gridSpacing;
                        newX = Math.round(newX / spacing) * spacing;
                        newY = Math.round(newY / spacing) * spacing;
                    }
                    
                    person.x = newX;
                    person.y = newY;
                }
            });
            
            this.app.render();
            return;
        }

        // Single node drag
        if (this.isDragging && this.draggedPerson) {
            let newX = (e.clientX - this.startX) / this.app.renderer.currentZoom;
            let newY = (e.clientY - this.startY) / this.app.renderer.currentZoom;

            // Show snap preview if magnet is enabled
            if (this.app.state.isMagnetEnabled && this.app.renderer && this.app.renderer.gridSpacing) {
                const spacing = this.app.renderer.gridSpacing;
                const snappedX = Math.round(newX / spacing) * spacing;
                const snappedY = Math.round(newY / spacing) * spacing;
                
                // Show snap preview
                this.showSnapPreview(snappedX, snappedY);
                
                // Apply snap
                newX = snappedX;
                newY = snappedY;
            } else {
                this.hideSnapPreview();
            }

            // Check for collisions
            const hasCollision = this.checkCollision(newX, newY);
            this.showCollisionWarning(newX, newY, hasCollision);

            this.draggedPerson.x = newX;
            this.draggedPerson.y = newY;
            
            // Update drag shadow position
            this.updateDragShadow(newX, newY);
            
            this.app.render();
        }
    }

    onMouseUp(svg) {
        if (this.isPanning) {
            this.isPanning = false;
            svg.style.cursor = this.isSpacePressed ? 'grab' : '';
            if (this.app.renderer) {
                this.app.renderer.disableAutoCenter = false;
            }
        }
        
        // Selection box
        if (this.isSelectionBoxActive) {
            console.log('Selection box ended');
            this.isSelectionBoxActive = false;
            this.selectionBox.setAttribute('display', 'none');
            this.selectElementsInBox();
            this.justFinishedSelectionBox = true;
            // Reset the flag after a short delay
            setTimeout(() => {
                this.justFinishedSelectionBox = false;
            }, 100);
        }
        
        // Multi-drag
        if (this.isMultiDragging) {
            this.isMultiDragging = false;
            this.multiDragInitialPositions.clear();
            
            // Remove dragging class
            this.multiSelectedIds.forEach(id => {
                const n = document.querySelector(`[data-id="${id}"]`);
                if (n) n.classList.remove('dragging');
            });
            
            this.app.state.saveState();
        }
        
        // Single drag
        if (this.isDragging && this.draggedPerson) {
            const node = svg.querySelector(`[data-id="${this.draggedPerson.id}"]`);
            if (node) {
                node.classList.remove('dragging');
            }
            
            // Hide drag enhancements
            this.hideSnapPreview();
            this.hideDragShadow();
            this.hideCollisionWarning();
            
            this.app.state.saveState();
        }
        
        this.isDragging = false;
        this.draggedPerson = null;
    }

    onMouseLeave(svg) {
        if (this.isPanning) {
            this.isPanning = false;
            svg.style.cursor = this.isSpacePressed ? 'grab' : '';
            if (this.app.renderer) {
                this.app.renderer.disableAutoCenter = false;
            }
        }
        
        // Selection box
        if (this.isSelectionBoxActive) {
            this.isSelectionBoxActive = false;
            this.selectionBox.setAttribute('display', 'none');
        }
        
        // Multi-drag
        if (this.isMultiDragging) {
            this.isMultiDragging = false;
            this.multiDragInitialPositions.clear();
            
            // Remove dragging class
            this.multiSelectedIds.forEach(id => {
                const n = document.querySelector(`[data-id="${id}"]`);
                if (n) n.classList.remove('dragging');
            });
        }
        
        // Hide drag enhancements
        if (this.isDragging) {
            this.hideSnapPreview();
            this.hideDragShadow();
            this.hideCollisionWarning();
        }
    }
    
    // ========================================================================
    // DRAG ENHANCEMENTS
    // ========================================================================
    
    showSnapPreview(x, y) {
        if (this.snapPreview) {
            this.snapPreview.setAttribute('cx', x);
            this.snapPreview.setAttribute('cy', y);
            this.snapPreview.setAttribute('opacity', '0.6');
        }
    }
    
    hideSnapPreview() {
        if (this.snapPreview) {
            this.snapPreview.setAttribute('opacity', '0');
        }
    }
    
    showDragShadow(person) {
        if (!this.dragShadow) return;
        
        // Clear previous shadow
        this.dragShadow.innerHTML = '';
        
        // Create shadow shape based on gender
        let shape;
        if (person.gender === 'M') {
            shape = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            shape.setAttribute('x', -25);
            shape.setAttribute('y', -25);
            shape.setAttribute('width', 50);
            shape.setAttribute('height', 50);
        } else {
            shape = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            shape.setAttribute('r', 25);
        }
        
        shape.setAttribute('fill', '#2196F3');
        shape.setAttribute('opacity', '0.2');
        shape.setAttribute('stroke', '#2196F3');
        shape.setAttribute('stroke-width', '2');
        shape.setAttribute('stroke-dasharray', '5,5');
        
        this.dragShadow.appendChild(shape);
        this.dragShadow.setAttribute('opacity', '1');
        
        // Position shadow
        this.updateDragShadow(person.x, person.y);
    }
    
    updateDragShadow(x, y) {
        if (this.dragShadow) {
            this.dragShadow.setAttribute('transform', `translate(${x}, ${y})`);
        }
    }
    
    hideDragShadow() {
        if (this.dragShadow) {
            this.dragShadow.setAttribute('opacity', '0');
        }
    }
    
    checkCollision(x, y) {
        if (!this.draggedPerson) return false;
        
        // Check distance to other persons
        for (const person of this.app.state.persons) {
            if (person.id === this.draggedPerson.id) continue;
            
            const dx = person.x - x;
            const dy = person.y - y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < this.MIN_DISTANCE) {
                return true;
            }
        }
        
        return false;
    }
    
    showCollisionWarning(x, y, show) {
        if (this.collisionWarning) {
            if (show) {
                this.collisionWarning.setAttribute('cx', x);
                this.collisionWarning.setAttribute('cy', y);
                this.collisionWarning.setAttribute('opacity', '0.8');
                
                // Pulse animation
                this.collisionWarning.innerHTML = `
                    <animate attributeName="r" values="35;40;35" dur="0.6s" repeatCount="indefinite"/>
                    <animate attributeName="opacity" values="0.8;0.4;0.8" dur="0.6s" repeatCount="indefinite"/>
                `;
            } else {
                this.hideCollisionWarning();
            }
        }
    }
    
    hideCollisionWarning() {
        if (this.collisionWarning) {
            this.collisionWarning.setAttribute('opacity', '0');
            this.collisionWarning.innerHTML = '';
        }
    }

    setupNodeSelection(svg) {
        svg.addEventListener('click', (e) => {
            const node = e.target.closest('.genogram-node');
            if (node) {
                e.stopPropagation();
                const personId = node.dataset.id;
                const person = this.app.state.findPerson(personId);
                if (person) {
                    // Ctrl/Cmd + Click for multi-select toggle
                    if (e.ctrlKey || e.metaKey) {
                        this.toggleMultiSelection(personId);
                        return;
                    }
                    
                    // Regular selection
                    if (!this.multiSelectedIds.has(personId)) {
                        this.app.selectionManager.selectPerson(person);
                    }
                }
            }
        });
    }

    setupContextMenu(svg) {
        // Relationship click handler
        svg.addEventListener('click', (e) => {
            const relationshipGroup = e.target.closest('.relationship-group, .emotional-group, .parent-child-group');
            if (relationshipGroup) {
                e.stopPropagation();
                const relId = relationshipGroup.dataset.id;
                const relationship = this.app.state.findRelationship(relId);
                if (relationship) {
                    this.app.selectionManager.selectRelationship(relationship);
                }
            }
        });
        
        svg.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            
            // Person context menu
            const node = e.target.closest('.genogram-node');
            if (node) {
                const personId = node.dataset.id;
                const person = this.app.state.findPerson(personId);
                if (person) {
                    const items = this.app.contextMenu.getPersonMenuItems(person);
                    this.app.contextMenu.show(e.clientX, e.clientY, items, person, 'person');
                }
                return;
            }
            
            // Relationship context menu
            const relationshipGroup = e.target.closest('.relationship-group, .emotional-group, .parent-child-group');
            if (relationshipGroup) {
                const relId = relationshipGroup.dataset.id;
                const relationship = this.app.state.findRelationship(relId);
                if (relationship) {
                    let items;
                    if (relationship.type === 'emotional') {
                        items = this.app.contextMenu.getEmotionalMenuItems(relationship);
                    } else {
                        items = this.app.contextMenu.getRelationshipMenuItems(relationship);
                    }
                    this.app.contextMenu.show(e.clientX, e.clientY, items, relationship, 'relationship');
                }
                return;
            }

            // Canvas context menu removed - no context menu on blank canvas
        });
    }

    setupWheelZoom(svg) {
        svg.addEventListener('wheel', (e) => {
            e.preventDefault();

            // 휠 방향에 따라 줌 인/아웃
            const delta = e.deltaY > 0 ? -1 : 1;
            const zoomFactor = delta > 0 ? 1.1 : 0.9;

            // 현재 줌 레벨 계산
            const currentZoom = this.app.renderer.currentZoom;
            let newZoom = currentZoom * zoomFactor;

            // 줌 범위 제한 (0.1 ~ 3.0)
            newZoom = Math.max(0.1, Math.min(3.0, newZoom));

            // 줌 적용
            this.app.renderer.setZoom(newZoom);

            // 툴바 줌 디스플레이 업데이트
            if (this.app.toolbar && typeof this.app.toolbar.updateZoomDisplay === 'function') {
                this.app.toolbar.updateZoomDisplay(newZoom);
            }
        }, { passive: false });
    }

    // ========================================================================
    // MULTI-SELECT HELPERS
    // ========================================================================
    
    get multiSelectedIds() {
        if (!this._multiSelectedIds) {
            this._multiSelectedIds = new Set();
        }
        return this._multiSelectedIds;
    }
    
    toggleMultiSelection(personId) {
        if (this.multiSelectedIds.has(personId)) {
            this.multiSelectedIds.delete(personId);
        } else {
            this.multiSelectedIds.add(personId);
        }
        
        this.updateMultiSelectionVisuals();
        this.showMultiSelectionCount();
    }
    
    clearMultiSelection() {
        this.multiSelectedIds.clear();
        this.updateMultiSelectionVisuals();
    }
    
    updateSelectionBox() {
        if (!this.selectionBox) return;
        
        const x1 = Math.min(this.selectionBoxStart.x, this.selectionBoxEnd.x);
        const y1 = Math.min(this.selectionBoxStart.y, this.selectionBoxEnd.y);
        const x2 = Math.max(this.selectionBoxStart.x, this.selectionBoxEnd.x);
        const y2 = Math.max(this.selectionBoxStart.y, this.selectionBoxEnd.y);
        
        this.selectionBox.setAttribute('x', x1);
        this.selectionBox.setAttribute('y', y1);
        this.selectionBox.setAttribute('width', x2 - x1);
        this.selectionBox.setAttribute('height', y2 - y1);
    }
    
    selectElementsInBox() {
        const x1 = Math.min(this.selectionBoxStart.x, this.selectionBoxEnd.x);
        const y1 = Math.min(this.selectionBoxStart.y, this.selectionBoxEnd.y);
        const x2 = Math.max(this.selectionBoxStart.x, this.selectionBoxEnd.x);
        const y2 = Math.max(this.selectionBoxStart.y, this.selectionBoxEnd.y);
        
        console.log('Selection box:', { x1, y1, x2, y2 });
        
        // Clear previous selection if not holding Ctrl
        if (!this.isCtrlPressed) {
            this.clearMultiSelection();
        }
        
        // Select persons within box
        let selectedCount = 0;
        this.app.state.persons.forEach(person => {
            console.log('Checking person:', person.getDisplayName(), 'at', person.x, person.y);
            if (person.x >= x1 && person.x <= x2 && person.y >= y1 && person.y <= y2) {
                console.log('  -> Selected!');
                this.multiSelectedIds.add(person.id);
                selectedCount++;
            }
        });
        
        console.log('Total selected:', selectedCount, 'IDs:', Array.from(this.multiSelectedIds));
        
        // Apply visual styling after selection - with a slight delay to ensure DOM is ready
        setTimeout(() => {
            this.updateMultiSelectionVisuals();
            this.showMultiSelectionCount();
        }, 0);
    }
    
    showMultiSelectionCount() {
        const count = this.multiSelectedIds.size;
        if (count > 0) {
            // Show temporary toast
            if (this.app.toolbar && this.app.toolbar.showToast) {
                this.app.toolbar.showToast(`${count}명 선택됨`, 'info', 1000);
            }
        }
    }
    
    deleteMultiSelected() {
        if (this.multiSelectedIds.size === 0) {
            return;
        }
        
        const count = this.multiSelectedIds.size;
        if (!confirm(`선택한 ${count}명을 삭제하시겠습니까?`)) {
            return;
        }
        
        // Delete all selected persons
        const idsToDelete = Array.from(this.multiSelectedIds);
        idsToDelete.forEach(personId => {
            this.app.personOps.deletePerson(personId);
        });
        
        this.clearMultiSelection();
        this.app.render();
        this.app.state.saveState();
        
        if (this.app.toolbar && this.app.toolbar.showToast) {
            this.app.toolbar.showToast(`${count}명이 삭제되었습니다`, 'success');
        }
    }
    
    getSVGPoint(e) {
        const svg = document.getElementById('canvas');
        const mainGroup = document.getElementById('main-group');
        
        if (!svg || !mainGroup) {
            console.error('SVG or mainGroup not found');
            return { x: 0, y: 0 };
        }
        
        // Get SVG bounding rect
        const svgRect = svg.getBoundingClientRect();
        
        // Calculate mouse position relative to SVG
        const x = e.clientX - svgRect.left;
        const y = e.clientY - svgRect.top;
        
        // Create SVG point
        const pt = svg.createSVGPoint();
        pt.x = x;
        pt.y = y;
        
        // Get the transformation matrix of main-group
        const ctm = mainGroup.getCTM();
        if (!ctm) {
            console.error('Could not get CTM');
            return { x: 0, y: 0 };
        }
        
        // Transform the point using the inverse matrix
        const transformedPt = pt.matrixTransform(ctm.inverse());
        
        console.log('Mouse client:', { x: e.clientX, y: e.clientY });
        console.log('SVG rect:', svgRect);
        console.log('Relative:', { x, y });
        console.log('Transformed:', { x: transformedPt.x, y: transformedPt.y });
        
        return { x: transformedPt.x, y: transformedPt.y };
    }
    
    // ========================================================================
    // KEYBOARD SHORTCUTS
    // ========================================================================
    
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Track Ctrl key for selection box
            if (e.ctrlKey || e.metaKey) {
                this.isCtrlPressed = true;
            }
            
            // Delete key - delete multi-selected or single selected
            if (e.key === 'Delete' || e.key === 'Backspace') {
                // Prevent if editing
                if (this.app.inlineEdit && this.app.inlineEdit.isEditing()) {
                    return;
                }
                
                // Check for multi-selection first
                if (this.multiSelectedIds.size > 0) {
                    e.preventDefault();
                    this.deleteMultiSelected();
                    return;
                }
                
                // Otherwise check for single selection
                const selectedPerson = this.app.selectionManager.getSelectedPerson();
                if (selectedPerson) {
                    e.preventDefault();
                    if (confirm(`"${selectedPerson.getDisplayName()}"을(를) 삭제하시겠습니까?`)) {
                        this.app.personOps.deletePerson(selectedPerson);
                        this.app.render();
                        this.app.state.saveState();
                    }
                    return;
                }
                
                // Check for selected relationship
                const selectedRel = this.app.selectionManager.getSelectedRelationship();
                if (selectedRel) {
                    e.preventDefault();
                    if (confirm('선택한 관계를 삭제하시겠습니까?')) {
                        this.app.state.removeRelationship(selectedRel.id);
                        this.app.selectionManager.deselectAll();
                        this.app.render();
                        this.app.state.saveState();
                    }
                }
            }
            
            // Escape - clear selection
            if (e.key === 'Escape') {
                this.clearMultiSelection();
                this.app.selectionManager.deselectAll();
            }
            
            // Ctrl+A - select all
            if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
                e.preventDefault();
                this.selectAll();
            }
        });
        
        document.addEventListener('keyup', (e) => {
            if (!e.ctrlKey && !e.metaKey) {
                this.isCtrlPressed = false;
            }
        });
    }
    
    selectAll() {
        this.clearMultiSelection();
        this.app.state.persons.forEach(person => {
            this.multiSelectedIds.add(person.id);
        });
        this.updateMultiSelectionVisuals();
        this.showMultiSelectionCount();
    }
    
    updateMultiSelectionVisuals() {
        console.log('Updating multi-selection visuals for:', Array.from(this.multiSelectedIds));
        
        // Remove all multi-selected classes first
        document.querySelectorAll('.multi-selected').forEach(node => {
            console.log('Removing multi-selected from:', node.dataset.id);
            node.classList.remove('multi-selected');
        });
        
        // Add multi-selected class to currently selected nodes
        let appliedCount = 0;
        this.multiSelectedIds.forEach(personId => {
            const node = document.querySelector(`[data-id="${personId}"]`);
            if (node) {
                console.log('Adding multi-selected to:', personId);
                node.classList.add('multi-selected');
                appliedCount++;
            } else {
                console.warn('Node not found for person ID:', personId);
            }
        });
        
        console.log('Applied multi-selected class to', appliedCount, 'nodes');
    }

    // Update interactions after render
    update() {
        // Restore multi-selection visuals after render
        this.updateMultiSelectionVisuals();
        
        // Note: Relationship click handlers are now in setupContextMenu() to avoid duplicates
        
        // Double-click for inline editing
        document.querySelectorAll('.genogram-node').forEach(node => {
            const labelElement = node.querySelector('.node-label-name');
            if (labelElement) {
                labelElement.addEventListener('dblclick', (e) => {
                    e.stopPropagation();
                    const personId = node.dataset.id;
                    const person = this.app.state.findPerson(personId);
                    if (person && !this.app.inlineEdit.isEditing()) {
                        this.app.inlineEdit.startEdit(person, labelElement);
                    }
                });

                labelElement.style.cursor = 'text';
            }
        });
    }
}
