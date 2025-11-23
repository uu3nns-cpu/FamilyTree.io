// ============================================================================  
// SVG RENDERER - Standard Genogram Style (Fixed Parent-Child Lines)  
// ============================================================================

class SVGRenderer {
    constructor(svgElement) {
        this.svg = svgElement;
        this.nodeSize = 60;
        this.currentZoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.coupleConnectorLength = 14;
        this.gridMode = 'solid';
        this.gridSpacing = 30;
        this.gridMargin = 400;
        this.gridColor = '#e5e7eb';
        this.labelVisibility = { showNames: true, showAges: true };
        this.shapeStrokeWidth = 2;
        this.relationshipStrokeWidth = 2;
        this.emotionalStrokeWidth = 1.5;
        this.disableAutoCenter = false;
        this.setupSVG();

        // Initialize emotional renderer
        if (typeof EmotionalRenderer !== 'undefined') {
            this.emotionalRenderer = new EmotionalRenderer(this);
        }
    }

    setupSVG() {
        this.mainGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        this.mainGroup.setAttribute('id', 'main-group');
        this.svg.appendChild(this.mainGroup);

        // Layer order (bottom to top): parent-child -> couple -> emotional -> preview -> nodes -> legend
        this.layerGrid = this.createLayer('grid');
        this.layerParentChild = this.createLayer('parent-child');
        this.layerCouple = this.createLayer('couple');
        this.layerEmotional = this.createLayer('emotional');
        this.layerPreview = this.createLayer('preview');
        this.layerNodes = this.createLayer('nodes');
        this.layerLegend = this.createLayer('legend');
        
        this.mainGroup.appendChild(this.layerGrid);
        this.mainGroup.appendChild(this.layerParentChild);
        this.mainGroup.appendChild(this.layerCouple);
        this.mainGroup.appendChild(this.layerEmotional);
        this.mainGroup.appendChild(this.layerPreview);
        this.mainGroup.appendChild(this.layerNodes);
        this.mainGroup.appendChild(this.layerLegend);
        this.createEmotionalMarkers();
    }

    createLayer(id) {
        const layer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        layer.setAttribute('id', `layer-${id}`);
        return layer;
    }

    createEmotionalMarkers() {
        if (!this.svg) return;
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
        marker.setAttribute('id', 'emotion-arrow');
        marker.setAttribute('markerWidth', '8');
        marker.setAttribute('markerHeight', '8');
        marker.setAttribute('refX', '7');
        marker.setAttribute('refY', '3');
        marker.setAttribute('orient', 'auto');
        marker.setAttribute('markerUnits', 'strokeWidth');
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', 'M0,0 L0,6 L6,3 z');
        path.setAttribute('fill', 'currentColor');
        marker.appendChild(path);
        defs.appendChild(marker);
        this.svg.insertBefore(defs, this.svg.firstChild);
        this.emotionMarker = marker;
    }

    calculateCoupleLineY(parents) {
        if (!parents.length) return 0;
        const bottomY = Math.max(...parents.map(p => p.y + this.nodeSize / 2));
        return bottomY + this.coupleConnectorLength;
    }

    clear() {
        this.layerNodes.innerHTML = '';
        this.layerCouple.innerHTML = '';
        this.layerParentChild.innerHTML = '';
        this.layerEmotional.innerHTML = '';
        if (this.layerGrid) {
            this.layerGrid.innerHTML = '';
        }
        if (this.layerPreview) {
            this.layerPreview.innerHTML = '';
        }
        // Note: layerLegend is NOT cleared - it's managed by Legend class
    }

    render(persons, relationships, newEmotionalRelId = null) {
        this.clear();
        this.renderGrid(persons);

        // Show hint if canvas is empty
        if (persons.length === 0) {
            this.showEmptyCanvasHint();
        } else {
            this.hideHints();
        }

        // Render relationships in proper order
        relationships.forEach(rel => {
            if (rel.type === 'couple') this.renderCoupleRelationship(rel, persons);
        });

        relationships.forEach(rel => {
            if (rel.type === 'parent-child') this.renderParentChildRelationship(rel, persons);
        });

        relationships.forEach(rel => {
            if (rel.type === 'emotional') {
                const isNew = (newEmotionalRelId && rel.id === newEmotionalRelId);
                this.renderEmotionalRelationship(rel, persons, isNew);
            }
        });

        // Render persons on top
        persons.forEach(person => this.renderPerson(person));
    }

    setLabelVisibility({ showNames = true, showAges = true } = {}) {
        this.labelVisibility = { showNames, showAges };
        if (!this.svg) return;
        this.svg.classList.toggle('hide-names', !showNames);
        this.svg.classList.toggle('hide-ages', !showAges);
        // Hide center ages
        this.svg.classList.toggle('hide-ages-center', !showAges);
    }

    renderPerson(person) {
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.setAttribute('class', `genogram-node node-${person.gender.toLowerCase()} ${person.isCT ? 'node-ct' : ''} ${person.isDeceased ? 'node-deceased' : ''}`);
        group.setAttribute('data-id', person.id);
        group.setAttribute('transform', `translate(${person.x}, ${person.y})`);

        if (person.isCT) {
            group.appendChild(this.createCTHighlight(person));
        }

        group.appendChild(this.createPersonShape(person));
        if (person.isDeceased) group.appendChild(this.createDeceasedMark());
        group.appendChild(this.createPersonLabel(person));

        this.layerNodes.appendChild(group);
    }

    createPersonShape(person) {
        const size = this.nodeSize;
        const half = size / 2;
        let shape;

        if (person.gender === 'M') {
            shape = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            shape.setAttribute('x', -half);
            shape.setAttribute('y', -half);
            shape.setAttribute('width', size);
            shape.setAttribute('height', size);
        } else if (person.gender === 'F') {
            shape = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            shape.setAttribute('cx', 0);
            shape.setAttribute('cy', 0);
            shape.setAttribute('r', half);
        } else {
            shape = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            shape.setAttribute('points', `0,${-half} ${half},0 0,${half} ${-half},0`);
        }

        shape.setAttribute('class', 'node-shape');
        shape.style.strokeWidth = `${this.shapeStrokeWidth}px`;
        return shape;
    }

    createDeceasedMark() {
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        const half = this.nodeSize / 2;
        const inset = Math.max(half - 8, 6);

        const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line1.setAttribute('x1', -inset);
        line1.setAttribute('y1', -inset);
        line1.setAttribute('x2', inset);
        line1.setAttribute('y2', inset);
        line1.setAttribute('class', 'deceased-x');
        line1.setAttribute('stroke-width', this.shapeStrokeWidth);
        
        const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line2.setAttribute('x1', inset);
        line2.setAttribute('y1', -inset);
        line2.setAttribute('x2', -inset);
        line2.setAttribute('y2', inset);
        line2.setAttribute('class', 'deceased-x');
        line2.setAttribute('stroke-width', this.shapeStrokeWidth);
        
        group.appendChild(line1);
        group.appendChild(line2);
        return group;
    }

    createPersonLabel(person) {
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.setAttribute('class', 'node-label');

        // Name label below the node
        const name = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        name.setAttribute('x', 0);
        name.setAttribute('y', this.nodeSize / 2 + 20);
        name.setAttribute('class', 'node-label-name');
        name.textContent = person.getDisplayName();
        group.appendChild(name);

        // Age label in the center of the node
        const age = person.getAge();
        if (age !== null) {
            const ageText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            ageText.setAttribute('x', 0);
            ageText.setAttribute('y', 5); // Center of node
            ageText.setAttribute('class', 'node-label-age-center');
            ageText.textContent = `${age}`;
            group.appendChild(ageText); // FIXED: Add age label to group
        }

        return group;
    }

    createCTHighlight(person) {
        // Standard Genogram: CT indicated with double outline
        const size = this.nodeSize;
        const half = size / 2;
        const offset = 6; // Spacing for outer outline
        let outerShape;

        if (person.gender === 'M') {
            // Male: square with outer border
            outerShape = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            outerShape.setAttribute('x', -(half + offset));
            outerShape.setAttribute('y', -(half + offset));
            outerShape.setAttribute('width', size + offset * 2);
            outerShape.setAttribute('height', size + offset * 2);
        } else if (person.gender === 'F') {
            // Female: circle with outer border
            outerShape = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            outerShape.setAttribute('cx', 0);
            outerShape.setAttribute('cy', 0);
            outerShape.setAttribute('r', half + offset);
        } else {
            // Non-binary: diamond shape with outer border
            outerShape = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            const outerHalf = half + offset;
            outerShape.setAttribute('points', `0,${-outerHalf} ${outerHalf},0 0,${outerHalf} ${-outerHalf},0`);
        }

        outerShape.setAttribute('class', 'ct-highlight');
        outerShape.style.strokeWidth = `${this.shapeStrokeWidth}px`;
        return outerShape;
    }

    /**
     * STANDARD GENOGRAM: Couple line at BOTTOM of nodes
     * Reference style:
     * ⬜️         �?     * ?��??�?�?�?��??�?�?�?? (couple line connects at bottom of symbols)
     */
    renderCoupleRelationship(rel, persons) {
        const from = persons.find(p => p.id === rel.from);
        const to = persons.find(p => p.id === rel.to);
        if (!from || !to) return;

        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.setAttribute('class', `relationship-group relationship-${rel.subtype}`);
        group.setAttribute('data-id', rel.id);

        const coupleLineY = this.calculateCoupleLineY([from, to]);

        // Vertical connectors from each spouse to the couple line
        [from, to].forEach(person => {
            const bottomY = person.y + this.nodeSize / 2;
            const connector = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            connector.setAttribute('x1', person.x);
            connector.setAttribute('y1', bottomY);
            connector.setAttribute('x2', person.x);
            connector.setAttribute('y2', coupleLineY);
            connector.setAttribute('class', 'relationship-connector');
            connector.style.strokeWidth = `${this.relationshipStrokeWidth}px`;
            group.appendChild(connector);
        });

        // Horizontal couple line
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', from.x);
        line.setAttribute('y1', coupleLineY);
        line.setAttribute('x2', to.x);
        line.setAttribute('y2', coupleLineY);
        line.setAttribute('class', `relationship-line relationship-${rel.subtype}`);
        line.style.strokeWidth = `${this.relationshipStrokeWidth}px`;
        group.appendChild(line);

        // Add markers for separated/divorced at the midpoint
        if (rel.subtype === 'separated' || rel.subtype === 'divorced') {
            const midX = (from.x + to.x) / 2;
            const midY = coupleLineY;
            this.createRelationshipMarks(rel, midX, midY).forEach(mark => group.appendChild(mark));
        }

        this.layerCouple.appendChild(group);
    }

    createRelationshipMarks(rel, midX, midY) {
        const marks = [];
        
        if (rel.subtype === 'separated') {
            // One slash through the couple line
            const mark = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            mark.setAttribute('x1', midX - 8);
            mark.setAttribute('y1', midY - 12);
            mark.setAttribute('x2', midX + 8);
            mark.setAttribute('y2', midY + 12);
            mark.setAttribute('class', 'separation-mark');
            mark.style.strokeWidth = `${this.relationshipStrokeWidth}px`;
            marks.push(mark);
        } else if (rel.subtype === 'divorced') {
            // Two slashes through the couple line
            const mark1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            mark1.setAttribute('x1', midX - 12);
            mark1.setAttribute('y1', midY - 12);
            mark1.setAttribute('x2', midX - 4);
            mark1.setAttribute('y2', midY + 12);
            mark1.setAttribute('class', 'divorce-mark');
            mark1.style.strokeWidth = `${this.relationshipStrokeWidth}px`;
            
            const mark2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            mark2.setAttribute('x1', midX + 4);
            mark2.setAttribute('y1', midY - 12);
            mark2.setAttribute('x2', midX + 12);
            mark2.setAttribute('y2', midY + 12);
            mark2.setAttribute('class', 'divorce-mark');
            mark2.style.strokeWidth = `${this.relationshipStrokeWidth}px`;
            
            marks.push(mark1, mark2);
        }
        return marks;
    }

    /**
     * STANDARD GENOGRAM: Parent-child lines follow the standard pattern
     * Reference style:
     * ⬜️         �?     *  ?��??�?�?�?��??�?�?�?? (couple line at bottom)
     *       |       (vertical from couple line center DOWN)
     *  ?�?�?�?�?�?��??�?�?�?�  (sibling spine)
     *   |   |   |
     * ?��?1 ?��?2 ?��?3
     * 
     * CRITICAL: Vertical line should connect couple line to children's center
     */
    renderParentChildRelationship(rel, persons) {
        const parents = rel.parents.map(id => persons.find(p => p.id === id)).filter(p => p);
        const children = rel.children.map(id => persons.find(p => p.id === id)).filter(p => p);
        if (parents.length === 0 || children.length === 0) return;

        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.setAttribute('class', 'parent-child-group');
        const lineWidth = this.relationshipStrokeWidth;

        const coupleLineY = this.calculateCoupleLineY(parents);
        
        // Calculate couple line center X (midpoint between parents, or parent X if single parent)
        const parentCenterX = parents.reduce((sum, p) => sum + p.x, 0) / parents.length;
        
        console.log('[RENDERER] parents:', parents.map(p => `${p.name}(${p.x})`).join(', '));
        console.log('[RENDERER] parentCenterX:', parentCenterX);
        
        // Calculate children's center X
        const childrenCenterX = children.reduce((sum, c) => sum + c.x, 0) / children.length;
        
        // Calculate children Y position (top edge of children nodes)
        const childrenTopY = children[0].y - this.nodeSize / 2;
        
        // Calculate sibling spine Y position (halfway between couple line and children)
        const spineY = coupleLineY + (childrenTopY - coupleLineY) * 0.6;
        
        // Step 1: Vertical line from couple line center to sibling spine level
        const vLine1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        vLine1.setAttribute('x1', parentCenterX);
        vLine1.setAttribute('y1', coupleLineY);
        vLine1.setAttribute('x2', parentCenterX);
        vLine1.setAttribute('y2', spineY);
        vLine1.setAttribute('class', 'parent-child-line');
        vLine1.style.strokeWidth = `${lineWidth}px`;
        group.appendChild(vLine1);

        // Step 2: If parent center and children center are different, add horizontal connector
        if (Math.abs(parentCenterX - childrenCenterX) > 5) {
            const hLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            hLine.setAttribute('x1', parentCenterX);
            hLine.setAttribute('y1', spineY);
            hLine.setAttribute('x2', childrenCenterX);
            hLine.setAttribute('y2', spineY);
            hLine.setAttribute('class', 'parent-child-connector');
            hLine.style.strokeWidth = `${lineWidth}px`;
            group.appendChild(hLine);
        }

        // Step 3 is now handled by Step 2's horizontal connector
        // No additional vertical line needed here

        // Step 4: Horizontal sibling spine (if multiple children)
        if (children.length > 1) {
            const minX = Math.min(...children.map(c => c.x));
            const maxX = Math.max(...children.map(c => c.x));
            
            const spine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            spine.setAttribute('x1', minX);
            spine.setAttribute('y1', spineY);
            spine.setAttribute('x2', maxX);
            spine.setAttribute('y2', spineY);
            spine.setAttribute('class', 'sibling-spine');
            spine.style.strokeWidth = `${lineWidth}px`;
            group.appendChild(spine);
        }

        // Step 5: Vertical lines from spine down to each child
        children.forEach(child => {
            const cLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            cLine.setAttribute('x1', child.x);
            cLine.setAttribute('y1', spineY);
            cLine.setAttribute('x2', child.x);
            cLine.setAttribute('y2', child.y - this.nodeSize / 2);
            cLine.setAttribute('class', 'parent-child-line');
            cLine.style.strokeWidth = `${lineWidth}px`;
            group.appendChild(cLine);
        });

        this.layerParentChild.appendChild(group);
    }

    setGridMode(mode) {
        this.gridMode = mode || 'solid';
    }

    setStrokeWidths({ shape, relationship, emotional } = {}) {
        if (shape !== undefined) this.shapeStrokeWidth = shape;
        if (relationship !== undefined) this.relationshipStrokeWidth = relationship;
        if (emotional !== undefined) this.emotionalStrokeWidth = emotional;
    }

    renderGrid(persons) {
        if (!this.layerGrid) {
            return;
        }

        if (this.gridMode === 'none') {
            this.layerGrid.innerHTML = '';
            return;
        }

        this.layerGrid.innerHTML = '';

        const spacing = this.gridSpacing || 60;

        // Get SVG viewport dimensions
        const svgRect = this.svg.getBoundingClientRect();
        const viewWidth = svgRect.width;
        const viewHeight = svgRect.height;

        // Calculate visible area in SVG coordinates
        const scale = this.currentZoom;
        const visibleLeft = -this.panX / scale;
        const visibleTop = -this.panY / scale;
        const visibleRight = visibleLeft + viewWidth / scale;
        const visibleBottom = visibleTop + viewHeight / scale;
        
        // [Comment removed due to encoding issues]
        const buffer = spacing * 20; // [Comment removed due to encoding issues]
        const startX = Math.floor((visibleLeft - buffer) / spacing) * spacing;
        const endX = Math.ceil((visibleRight + buffer) / spacing) * spacing;
        const startY = Math.floor((visibleTop - buffer) / spacing) * spacing;
        const endY = Math.ceil((visibleBottom + buffer) / spacing) * spacing;
        
        const dashPattern = this.gridMode === 'dashed' ? '4 4' : '';
        const opacity = this.gridMode === 'dashed' ? 0.7 : 0.55;
        const strokeWidth = this.gridMode === 'dashed' ? 1.2 : 1.4;

        // Draw vertical grid lines
        for (let x = startX; x <= endX; x += spacing) {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', x);
            line.setAttribute('y1', startY);
            line.setAttribute('x2', x);
            line.setAttribute('y2', endY);
            line.setAttribute('stroke', this.gridColor);
            line.setAttribute('stroke-width', strokeWidth);
            line.setAttribute('stroke-opacity', opacity);
            if (dashPattern) {
                line.setAttribute('stroke-dasharray', dashPattern);
            }
            this.layerGrid.appendChild(line);
        }

        // Draw horizontal grid lines
        for (let y = startY; y <= endY; y += spacing) {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', startX);
            line.setAttribute('y1', y);
            line.setAttribute('x2', endX);
            line.setAttribute('y2', y);
            line.setAttribute('stroke', this.gridColor);
            line.setAttribute('stroke-width', strokeWidth);
            line.setAttribute('stroke-opacity', opacity);
            if (dashPattern) {
                line.setAttribute('stroke-dasharray', dashPattern);
            }
            this.layerGrid.appendChild(line);
        }
    }

    renderEmotionalRelationship(rel, persons, isNew = false) {
        // Use EmotionalRenderer for rendering
        if (this.emotionalRenderer) {
            this.emotionalRenderer.renderEmotionalRelationship(rel, persons, isNew);
        }
    }

    createEmotionalPath(rel, from, to, isNew = false) {
        const elements = [];
        const x1 = from.x;
        const y1 = from.y;
        const x2 = to.x;
        const y2 = to.y;
        const dx = x2 - x1;
        const dy = y2 - y1;
        const length = Math.hypot(dx, dy);
        const style = EMOTIONAL_STYLES[rel.subtype] || EMOTIONAL_STYLES.default;
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        
        // [Comment removed due to encoding issues]
        const classList = ['emotional-line', `emotional-${rel.subtype}`];
        if (isNew) {
            classList.push('emotional-line-connecting', 'emotional-line-pulse');
        }
        path.setAttribute('class', classList.join(' '));
        
        path.style.stroke = style.color;
        path.style.strokeWidth = `${style.width}px`;
        
        // [Comment removed due to encoding issues]
        if (isNew) {
            path.style.setProperty('--pulse-width', style.width);
        }

        let pathData = `M ${x1} ${y1} L ${x2} ${y2}`;
        switch (style.builder) {
            case 'zigzag':
                pathData = this.buildZigzagPath(from, to, style.amplitude, Math.max(6, Math.floor(length / (style.step || 20))));
                break;
            case 'broken':
                pathData = this.buildBrokenPath(from, to, style.gap);
                break;
            case 'wavy':
                pathData = this.buildWavyPath(from, to, style.amplitude, Math.max(6, Math.floor(length / (style.step || 20))));
                break;
            case 'ticks':
                this.buildTickPath(elements, from, to, style.tickCount, style.tickLength, style.color, style.width, isNew);
                break;
            default:
                break;
        }

        path.setAttribute('d', pathData);
        if (style.dash) {
            path.setAttribute('stroke-dasharray', style.dash);
        }
        elements.push(path);

        if (style.extra) {
            style.extra.call(this, elements, rel, from, to);
        }

        return elements;
    }

    setZoom(zoom) {
        this.currentZoom = zoom;
        this.updateTransform();
        // [Comment removed due to encoding issues]
        this.updateGridForViewport();
    }

    updateTransform() {
        this.mainGroup.setAttribute('transform', 
            `translate(${this.panX}, ${this.panY}) scale(${this.currentZoom})`
        );
        // [Comment removed due to encoding issues]
        this.updateGridForViewport();
    }

    /**
     * Update grid for current viewport
     */
    updateGridForViewport() {
        if (this.gridMode === 'none' || !this.layerGrid) return;
        this.renderGrid([]);
    }

      fitToView() {
        const bbox = this.mainGroup.getBBox();
        if (bbox.width === 0 || bbox.height === 0) return;
        
        // [Comment removed due to encoding issues]
        this.currentZoom = 1.0;
        
        // [Comment removed due to encoding issues]
        const svgRect = this.svg.getBoundingClientRect();
        this.panX = svgRect.width / 2 - (bbox.x + bbox.width / 2) * this.currentZoom;
        this.panY = svgRect.height / 2 - (bbox.y + bbox.height / 2) * this.currentZoom;
        
        this.updateTransform();
        
        // [Comment removed due to encoding issues]
        if (window.genogramApp && window.genogramApp.toolbar) {
            window.genogramApp.toolbar.updateZoomDisplay(this.currentZoom);
        }
    }

    /**
     * Center view on CT (client) person
     * @param {Array} persons - Array of all persons
     */
    centerOnCT(persons) {
        if (this.disableAutoCenter) {
            return;
        }
        // [Comment removed due to encoding issues]
        const ct = persons.find(p => p.isCT);
        if (!ct) {
            // [Comment removed due to encoding issues]
            this.fitToView();
            return;
        }
        
        // [Comment removed due to encoding issues]
        this.currentZoom = 1.0;
        
        // [Comment removed due to encoding issues]
        const svgRect = this.svg.getBoundingClientRect();
        this.panX = svgRect.width / 2 - ct.x * this.currentZoom;
        this.panY = svgRect.height / 2 - ct.y * this.currentZoom;
        
        this.updateTransform();
        
        // [Comment removed due to encoding issues]
        if (window.genogramApp && window.genogramApp.toolbar) {
            window.genogramApp.toolbar.updateZoomDisplay(this.currentZoom);
        }
    }

    /**
     * Convert SVG coordinates to screen coordinates
     * Used for tutorial tooltip positioning
     */
    svgToScreen(svgX, svgY) {
        // Get SVG bounding rect
        const svgRect = this.svg.getBoundingClientRect();

        // Calculate screen position
        const screenX = svgRect.left + this.panX + svgX * this.currentZoom;
        const screenY = svgRect.top + this.panY + svgY * this.currentZoom;

        return { x: screenX, y: screenY };
    }

      buildZigzagPath(from, to, amplitude, steps) {
          const dx = to.x - from.x;
          const dy = to.y - from.y;
          let path = `M ${from.x} ${from.y}`;
          for (let i = 1; i <= steps; i++) {
              const t = i / steps;
              const x = from.x + dx * t;
              const y = from.y + dy * t;
              const perp = this.perpendicularOffset(from, to, (i % 2 === 0 ? 1 : -1) * amplitude);
              path += ` L ${x + perp.x} ${y + perp.y}`;
          }
          return path;
      }

      perpendicularOffset(from, to, amount) {
          const dx = to.x - from.x;
          const dy = to.y - from.y;
          const length = Math.hypot(dx, dy) || 1;
          return { x: -dy / length * amount, y: dx / length * amount };
      }

      buildBrokenPath(from, to, gap) {
          const dx = to.x - from.x;
          const dy = to.y - from.y;
          const length = Math.hypot(dx, dy);
          const segments = Math.floor(length / (gap * 2));
          let path = '';
          
          for (let i = 0; i < segments; i++) {
              const t1 = (i * 2 * gap) / length;
              const t2 = ((i * 2 + 1) * gap) / length;
              if (t2 > 1) break;
              
              const x1 = from.x + dx * t1;
              const y1 = from.y + dy * t1;
              const x2 = from.x + dx * t2;
              const y2 = from.y + dy * t2;
              
              path += `M ${x1} ${y1} L ${x2} ${y2} `;
          }
          return path;
      }

      buildWavyPath(from, to, amplitude, steps) {
          const dx = to.x - from.x;
          const dy = to.y - from.y;
          let path = `M ${from.x} ${from.y}`;
          
          for (let i = 1; i <= steps; i++) {
              const t = i / steps;
              const x = from.x + dx * t;
              const y = from.y + dy * t;
              const wave = Math.sin(i * Math.PI) * amplitude;
              const perp = this.perpendicularOffset(from, to, wave);
              path += ` L ${x + perp.x} ${y + perp.y}`;
          }
          return path;
      }

      buildTickPath(elements, from, to, tickCount, tickLength, color, width, isNew = false) {
          const dx = to.x - from.x;
          const dy = to.y - from.y;
          
          // Main line
          const mainLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          mainLine.setAttribute('x1', from.x);
          mainLine.setAttribute('y1', from.y);
          mainLine.setAttribute('x2', to.x);
          mainLine.setAttribute('y2', to.y);
          
          // [Comment removed due to encoding issues]
          const classList = ['emotional-line'];
          if (isNew) {
              classList.push('emotional-line-connecting', 'emotional-line-pulse');
          }
          mainLine.setAttribute('class', classList.join(' '));
          
          mainLine.style.stroke = color;
          mainLine.style.strokeWidth = `${width * this.emotionalStrokeWidth}px`;
          
          if (isNew) {
              mainLine.style.setProperty('--pulse-width', width * this.emotionalStrokeWidth);
          }
          
          elements.push(mainLine);
          
          // Tick marks
          for (let i = 1; i <= tickCount; i++) {
              const t = i / (tickCount + 1);
              const x = from.x + dx * t;
              const y = from.y + dy * t;
              const perp = this.perpendicularOffset(from, to, tickLength);
              
              const tick = document.createElementNS('http://www.w3.org/2000/svg', 'line');
              tick.setAttribute('x1', x - perp.x);
              tick.setAttribute('y1', y - perp.y);
              tick.setAttribute('x2', x + perp.x);
              tick.setAttribute('y2', y + perp.y);
              tick.setAttribute('class', 'emotional-tick');
              tick.style.stroke = color;
              tick.style.strokeWidth = `${width * this.emotionalStrokeWidth}px`;
              elements.push(tick);
          }
      }

      addParallelLine(elements, from, to, offset) {
          const perp = this.perpendicularOffset(from, to, offset);
          const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          line.setAttribute('x1', from.x + perp.x);
          line.setAttribute('y1', from.y + perp.y);
          line.setAttribute('x2', to.x + perp.x);
          line.setAttribute('y2', to.y + perp.y);
          line.setAttribute('class', 'emotional-line');
          elements.push(line);
      }

      /**
       * 감정??미리보기 ?�더�?       */
      renderPreviewLine(from, to, subtype) {
          if (this.emotionalRenderer) {
              this.emotionalRenderer.renderPreviewLine(from, to, subtype);
          }
      }
      
      /**
      * 감정??미리보기 ?�거
      */
      clearPreviewLine() {
          if (this.emotionalRenderer) {
              this.emotionalRenderer.clearPreviewLine();
          }
      }

    /**
     * Center view on CT person
     */
    centerOnCT(persons) {
        if (this.disableAutoCenter) {
            return;
        }

        const ct = persons.find(p => p.isCT);
        if (!ct) {
            // No CT found, fit to view instead
            this.fitToView();
            return;
        }

        // Reset zoom
        this.currentZoom = 1.0;

        // Center on CT position
        const svgRect = this.svg.getBoundingClientRect();
        this.panX = svgRect.width / 2 - ct.x * this.currentZoom;
        this.panY = svgRect.height / 2 - ct.y * this.currentZoom;

        this.updateTransform();

        // Update zoom display
        if (window.genogramApp && window.genogramApp.toolbar) {
            window.genogramApp.toolbar.updateZoomDisplay(this.currentZoom);
        }
    }

    /**
     * Show hint for empty canvas
     */
    showEmptyCanvasHint() {
        this.hideHints();

        const hintGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        hintGroup.setAttribute('id', 'canvas-hint');
        hintGroup.setAttribute('class', 'canvas-hint');

        // Background rect
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', '-200');
        rect.setAttribute('y', '-80');
        rect.setAttribute('width', '400');
        rect.setAttribute('height', '160');
        rect.setAttribute('rx', '12');
        rect.setAttribute('fill', 'var(--surface-base, #ffffff)');
        rect.setAttribute('stroke', 'var(--primary, #3b82f6)');
        rect.setAttribute('stroke-width', '2');
        rect.setAttribute('opacity', '0.95');
        rect.setAttribute('filter', 'drop-shadow(0 4px 12px rgba(0,0,0,0.1))');
        hintGroup.appendChild(rect);

        // Icon
        const icon = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        icon.setAttribute('x', '0');
        icon.setAttribute('y', '-35');
        icon.setAttribute('text-anchor', 'middle');
        icon.setAttribute('font-size', '32');
        icon.textContent = '👋';
        hintGroup.appendChild(icon);

        // Title text
        const title = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        title.setAttribute('x', '0');
        title.setAttribute('y', '0');
        title.setAttribute('text-anchor', 'middle');
        title.setAttribute('font-size', '18');
        title.setAttribute('font-weight', 'bold');
        title.setAttribute('fill', 'var(--text-primary, #1f2937)');
        title.textContent = 'Get Started';
        hintGroup.appendChild(title);

        // Instruction text 1
        const text1 = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text1.setAttribute('x', '0');
        text1.setAttribute('y', '30');
        text1.setAttribute('text-anchor', 'middle');
        text1.setAttribute('font-size', '14');
        text1.setAttribute('fill', 'var(--text-secondary, #6b7280)');
        text1.textContent = 'Select a template from the left, or';
        hintGroup.appendChild(text1);

        // Instruction text 2
        const text2 = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text2.setAttribute('x', '0');
        text2.setAttribute('y', '52');
        text2.setAttribute('text-anchor', 'middle');
        text2.setAttribute('font-size', '14');
        text2.setAttribute('fill', 'var(--text-secondary, #6b7280)');
        text2.textContent = 'Click here to add your first person';
        hintGroup.appendChild(text2);

        this.layerNodes.appendChild(hintGroup);
    }



    /**
     * 모든 ?�트 ?�기�?     */
    hideHints() {
        const existingHint = this.layerNodes.querySelector('#canvas-hint');
        if (existingHint) {
            existingHint.remove();
        }
    }
}
// ============================================================================
// LAYOUT ENGINE - Fixed: CT's parents always centered above CT
// ============================================================================

class AutoLayout {
    constructor() {
        this.nodeSize = 60;
        this.minSiblingSpacing = 120;
        this.minCoupleSpacing = 180;
        this.minGroupMargin = 120;
        this.minFamilyGap = 300;  // 친가/외가 사이 최소 간격
        this.generationSpacing = 140;  // 세대 간 세로 간격 (180 → 140으로 축소)
        this.gridSnap = 30;
        this.canvasCenter = 500;
    }

    getBirthOrderValue(person) {
        if (!person) return 0;
        const { birthOrder } = person;
        if (typeof birthOrder === 'number' && Number.isFinite(birthOrder)) {
            return birthOrder;
        }
        if (typeof birthOrder === 'string') {
            const parsed = parseInt(birthOrder, 10);
            if (!Number.isNaN(parsed)) {
                return parsed;
            }
        }
        return 0;
    }

    sortByBirthOrder(persons) {
        return [...persons].sort((a, b) => this.getBirthOrderValue(a) - this.getBirthOrderValue(b));
    }

    calculateGroupWidth(personCount) {
        if (personCount <= 1) return 0;
        return (personCount - 1) * this.minSiblingSpacing;
    }

    /**
     * Find spouse of a person
     */
    findSpouse(personId, relationships, allPersons) {
        const coupleRel = relationships.find(r => 
            r.type === 'couple' && (r.from === personId || r.to === personId)
        );
        if (!coupleRel) return null;
        
        const spouseId = coupleRel.from === personId ? coupleRel.to : coupleRel.from;
        return allPersons.find(p => p.id === spouseId);
    }

    /**
     * Main layout function
     * 순서: CT세대 → 자녀 → 부모 → 조부모
     * CT+배우자 커플을 기준으로 자녀를 배치
     */
    layout(persons, relationships) {
        const generations = this.groupByGeneration(persons);
        const positions = new Map();
        const anchors = new Map();
        
        // Check if grandparents exist
        const hasGrandparents = generations.has(-2) && generations.get(-2).length > 0;
        
        // STEP 1: Layout CT generation (Generation 0) - 먼저 배치
        const ctGen = generations.get(0);
        const ctAnchor = this.layoutCTGeneration(ctGen, positions, relationships);
        anchors.set(0, ctAnchor);
        
        // STEP 2: Layout children (Generation 1) - CT+배우자 커플 중심 기준
        const childGen = generations.get(1);
        const childrenAnchor = this.layoutChildrenGeneration(childGen, positions, ctAnchor);
        anchors.set(1, childrenAnchor);
        
        // STEP 3: Layout parents (Generation -1)
        const parentGen = generations.get(-1);
        const parentAnchor = this.layoutParentsGeneration(
            parentGen,
            ctAnchor,
            positions,
            relationships,
            persons,
            hasGrandparents
        );
        anchors.set(-1, parentAnchor);
        
        // STEP 4: Layout grandparents (Generation -2)
        const grandparentGen = generations.get(-2);
        const greatGrandparentGen = generations.get(-3);
        const hasGreatGrandparents = greatGrandparentGen && greatGrandparentGen.length > 0;

        const grandparentAnchor = this.layoutGrandparentsGeneration(
            grandparentGen,
            parentAnchor,
            positions,
            relationships,
            persons,  // Pass all persons to find parent generation
            hasGreatGrandparents
        );

        // STEP 5: Layout great-grandparents (Generation -3) if they exist
        if (hasGreatGrandparents && grandparentAnchor) {
            this.layoutGreatGrandparentsGeneration(
                greatGrandparentGen,
                grandparentAnchor,
                positions,
                relationships
            );
        }

        // Apply grid snapping
        persons.forEach(person => {
            const pos = positions.get(person.id);
            if (pos) {
                person.x = this.snapToGrid(pos.x);
                person.y = this.snapToGrid(pos.y);
            }
        });

        return positions;
    }

    groupByGeneration(persons) {
        const generations = new Map();
        persons.forEach(person => {
            if (!generations.has(person.generation)) {
                generations.set(person.generation, []);
            }
            generations.get(person.generation).push(person);
        });
        return generations;
    }

    /**
     * Layout children generation - CT+배우자 커플 중심 기준으로 배치
     */
    layoutChildrenGeneration(persons, positions, ctAnchor) {
        const y = 100 + (3 * this.generationSpacing);
        
        // CT+배우자 커플의 중심을 기준으로 사용
        const coupleCenter = ctAnchor ? ctAnchor.coupleCenterX : this.canvasCenter;
        
        if (!persons || persons.length === 0) {
            return {
                centerX: coupleCenter,
                leftBound: coupleCenter,
                rightBound: coupleCenter,
                count: 0
            };
        }

        const sorted = this.sortByBirthOrder(persons);
        const groupWidth = this.calculateGroupWidth(sorted.length);
        const startX = coupleCenter - groupWidth / 2;

        sorted.forEach((person, index) => {
            const x = startX + (index * this.minSiblingSpacing);
            positions.set(person.id, { x, y });
        });

        return {
            centerX: coupleCenter,
            leftBound: startX,
            rightBound: startX + groupWidth,
            count: sorted.length
        };
    }

    /**
     * Layout CT generation
     * CT와 형제들은 출생순서대로 배치
     * 배우자는 형제 그룹 오른쪽에 minGroupMargin 간격을 두고 배치
     */
    layoutCTGeneration(persons, positions, relationships) {
        const y = 100 + (2 * this.generationSpacing);
        
        if (!persons || persons.length === 0) {
            return {
                centerX: this.canvasCenter,
                coupleCenterX: this.canvasCenter,
                leftBound: this.canvasCenter,
                rightBound: this.canvasCenter
            };
        }

        // Separate CT+spouse from siblings
        const ct = persons.find(p => p.isCT);
        const spouse = ct ? this.findSpouse(ct.id, relationships, persons) : null;
        
        // Get true siblings (NOT spouses, same generation with side='both')
        const siblings = persons.filter(p => 
            !p.isCT && 
            (!spouse || p.id !== spouse.id) &&
            p.side === 'both'
        );

        if (ct && spouse) {
            // CT+배우자가 있는 경우
            // CT와 형제들을 출생순서대로 정렬
            const siblingGroup = [...siblings, ct];
            const sortedSiblings = this.sortByBirthOrder(siblingGroup);
            
            // 형제 그룹의 너비 계산
            const siblingGroupWidth = this.calculateGroupWidth(sortedSiblings.length);
            
            // 배우자와의 간격
            const spouseGap = this.minGroupMargin;
            
            // 전체 너비: 형제그룹 + 간격 + 배우자
            const totalWidth = siblingGroupWidth + spouseGap;
            
            // 전체를 중앙에 배치
            const siblingStartX = this.canvasCenter - totalWidth / 2;
            
            // 형제들 배치 (CT 포함)
            let ctX = this.canvasCenter;
            sortedSiblings.forEach((person, index) => {
                const x = siblingStartX + (index * this.minSiblingSpacing);
                positions.set(person.id, { x, y });
                if (person.id === ct.id) {
                    ctX = x;
                }
            });
            
            // 배우자는 형제 그룹 오른쪽에 간격을 두고 배치
            const lastSiblingX = siblingStartX + siblingGroupWidth;
            const spouseX = lastSiblingX + spouseGap;
            positions.set(spouse.id, { x: spouseX, y });

            // CT+배우자 커플의 중심 계산 (자녀 배치용)
            const coupleCenterX = (ctX + spouseX) / 2;

            // 전체 범위 계산
            const leftBound = siblingStartX;
            const rightBound = spouseX;
            
            return {
                centerX: ctX,           // CT의 실제 위치 (부모 배치용)
                coupleCenterX,          // CT+배우자 커플 중심 (자녀 배치용)
                leftBound,
                rightBound
            };
            
        } else if (ct) {
            // CT alone, possibly with siblings
            if (siblings.length === 0) {
                // Just CT
                positions.set(ct.id, { x: this.canvasCenter, y });
                return {
                    centerX: this.canvasCenter,
                    coupleCenterX: this.canvasCenter,
                    leftBound: this.canvasCenter,
                    rightBound: this.canvasCenter
                };
            } else {
                // CT with siblings - layout as sibling group
                const allSiblings = [...siblings, ct];
                const sorted = this.sortByBirthOrder(allSiblings);
                const groupWidth = this.calculateGroupWidth(sorted.length);
                const startX = this.canvasCenter - groupWidth / 2;
                
                let ctX = this.canvasCenter;
                sorted.forEach((person, index) => {
                    const x = startX + (index * this.minSiblingSpacing);
                    positions.set(person.id, { x, y });
                    if (person.id === ct.id) {
                        ctX = x;
                    }
                });
                
                return {
                    centerX: ctX,
                    coupleCenterX: ctX,  // 배우자 없으면 CT 위치가 커플 중심
                    leftBound: startX,
                    rightBound: startX + groupWidth
                };
            }
        }

        return {
            centerX: this.canvasCenter,
            coupleCenterX: this.canvasCenter,
            leftBound: this.canvasCenter,
            rightBound: this.canvasCenter
        };
    }

    /**
     * Layout parents generation
     * KEY FIX: CT의 직계 부모는 항상 CT 바로 위에 커플로 배치
     * 삼촌/고모/이모/외삼촌은 각각 친가/외가 쪽에 배치
     */
    layoutParentsGeneration(persons, ctAnchor, positions, relationships, allPersons, hasGrandparents) {
        const y = 100 + (1 * this.generationSpacing);
        
        if (!persons || persons.length === 0) {
            return {
                paternalAnchor: { centerX: ctAnchor.centerX },
                maternalAnchor: { centerX: ctAnchor.centerX }
            };
        }

        // Find CT and CT's direct parents
        const ct = allPersons.find(p => p.isCT);
        let directParents = [];
        
        if (ct) {
            const parentRel = relationships.find(r => 
                r.type === 'parent-child' && r.children.includes(ct.id)
            );
            
            if (parentRel) {
                directParents = parentRel.parents
                    .map(pid => allPersons.find(p => p.id === pid))
                    .filter(p => p);
            }
        }

        // CRITICAL FIX: 부모 커플의 중심은 모든 자녀들의 중심과 일치해야 함
        let coupleCenter = ctAnchor.centerX;

        if (ct) {
            // CT의 자녀(형제 포함) 관계를 찾기
            const siblingRel = relationships.find(r =>
                r.type === 'parent-child' && r.children.includes(ct.id)
            );

            if (siblingRel) {
                // 모든 형제자매의 중심 계산
                const allChildren = siblingRel.children
                    .map(cid => positions.get(cid))
                    .filter(pos => pos && typeof pos.x === 'number');

                if (allChildren.length > 0) {
                    // 형제자매 그룹의 중심 = 부모 커플의 중심
                    const oldCenter = coupleCenter;
                    coupleCenter = allChildren.reduce((sum, pos) => sum + pos.x, 0) / allChildren.length;
                    console.log('[LAYOUT] 부모 커플 중심 조정:', {
                        children: siblingRel.children.length,
                        childrenXs: allChildren.map(p => p.x),
                        oldCenter,
                        newCenter: coupleCenter
                    });
                }
            }
        }

        // CT의 직계 부모 2명이 있는 경우: CT 위에 커플로 배치
        if (directParents.length === 2) {
            const [parent1, parent2] = directParents;
            const father = parent1.gender === 'M' ? parent1 : parent2;
            const mother = parent1.gender === 'M' ? parent2 : parent1;

            // 나머지 인물들 (삼촌, 고모, 이모, 외삼촌) 분류
            const otherPersons = persons.filter(p =>
                !directParents.some(dp => dp.id === p.id)
            );

            const paternalOthers = this.sortByBirthOrder(
                otherPersons.filter(p => p.side === 'paternal')
            );
            const maternalOthers = this.sortByBirthOrder(
                otherPersons.filter(p => p.side === 'maternal')
            );

            // CRITICAL: 부모 커플 간격을 동적으로 계산
            let coupleSpacing = this.minCoupleSpacing;

            // 조부모 세대의 실제 인원 파악 (동적 계산용)
            const paternalGrandparents = hasGrandparents
                ? allPersons.filter(p => p.generation === -2 && p.side === 'paternal')
                : [];
            const maternalGrandparents = hasGrandparents
                ? allPersons.filter(p => p.generation === -2 && p.side === 'maternal')
                : [];

            // 1순위: 부모 형제가 모두 있는 경우 (삼촌/이모 등)
            if (paternalOthers.length > 0 && maternalOthers.length > 0) {
                const paternalWidth = (paternalOthers.length + 1) * this.minSiblingSpacing;
                const maternalWidth = (maternalOthers.length + 1) * this.minSiblingSpacing;
                coupleSpacing = Math.max(
                    this.minCoupleSpacing,
                    paternalWidth + maternalWidth + this.minFamilyGap
                );
            }
            // 2순위: 친가 형제만 있는 경우
            else if (paternalOthers.length > 0) {
                const paternalWidth = paternalOthers.length * this.minSiblingSpacing;
                coupleSpacing = Math.max(this.minCoupleSpacing, paternalWidth + this.minGroupMargin);
            }
            // 3순위: 외가 형제만 있는 경우
            else if (maternalOthers.length > 0) {
                const maternalWidth = maternalOthers.length * this.minSiblingSpacing;
                coupleSpacing = Math.max(this.minCoupleSpacing, maternalWidth + this.minGroupMargin);
            }
            // 4순위: 부모 형제는 없지만 양가 조부모가 모두 있는 경우
            else if (paternalGrandparents.length > 0 && maternalGrandparents.length > 0) {
                // CRITICAL: 출생 순서 기반 실제 확장 범위 계산

                // 친가 할아버지(아버지의 부모) 찾기
                const paternalGrandfather = paternalGrandparents.find(p =>
                    relationships.some(r =>
                        r.type === 'parent-child' &&
                        r.parents.includes(p.id) &&
                        r.children.includes(father.id)
                    )
                );

                // 외가 할아버지(어머니의 부모) 찾기
                const maternalGrandfather = maternalGrandparents.find(p =>
                    relationships.some(r =>
                        r.type === 'parent-child' &&
                        r.parents.includes(p.id) &&
                        r.children.includes(mother.id)
                    )
                );

                // 친가 조부모 중 할아버지와 같은 형제 그룹 찾기
                let paternalRightExtension = this.minCoupleSpacing / 2;
                if (paternalGrandfather && paternalGrandparents.length >= 2) {
                    const paternalGPSorted = this.sortByBirthOrder(paternalGrandparents);
                    const grandfatherIndex = paternalGPSorted.findIndex(p => p.id === paternalGrandfather.id);

                    if (paternalGPSorted.length === 2) {
                        // 커플만 있는 경우
                        paternalRightExtension = this.minCoupleSpacing / 2;
                    } else if (grandfatherIndex >= 0) {
                        // 형제가 있는 경우: 할아버지 오른쪽에 있는 형제 수 계산
                        const rightSiblings = paternalGPSorted.length - 1 - grandfatherIndex;
                        paternalRightExtension = rightSiblings * this.minSiblingSpacing + this.minCoupleSpacing / 2;
                    }
                }

                // 외가 조부모 중 할아버지와 같은 형제 그룹 찾기
                let maternalLeftExtension = this.minCoupleSpacing / 2;
                if (maternalGrandfather && maternalGrandparents.length >= 2) {
                    const maternalGPSorted = this.sortByBirthOrder(maternalGrandparents);
                    const grandfatherIndex = maternalGPSorted.findIndex(p => p.id === maternalGrandfather.id);

                    if (maternalGPSorted.length === 2) {
                        // 커플만 있는 경우
                        maternalLeftExtension = this.minCoupleSpacing / 2;
                    } else if (grandfatherIndex >= 0) {
                        // 형제가 있는 경우: 할아버지 왼쪽에 있는 형제 수 계산
                        const leftSiblings = grandfatherIndex;
                        maternalLeftExtension = leftSiblings * this.minSiblingSpacing + this.minCoupleSpacing / 2;
                    }
                }

                // 부모 커플 간격 = 친가 오른쪽 확장 + 외가 왼쪽 확장 + 최소 여유
                coupleSpacing = Math.max(
                    this.minCoupleSpacing,
                    paternalRightExtension + maternalLeftExtension + this.minGroupMargin
                );

                console.log('[LAYOUT] 출생순서 기반 동적 간격 계산:', {
                    친가조부모수: paternalGrandparents.length,
                    외가조부모수: maternalGrandparents.length,
                    친가오른쪽확장: paternalRightExtension,
                    외가왼쪽확장: maternalLeftExtension,
                    최종간격: coupleSpacing
                });
            }

            // 부모 커플 배치 (남편 왼쪽, 아내 오른쪽)
            const fatherX = coupleCenter - coupleSpacing / 2;
            const motherX = coupleCenter + coupleSpacing / 2;

            positions.set(father.id, { x: fatherX, y });
            positions.set(mother.id, { x: motherX, y });

            // 친가 쪽 형제들 (삼촌, 고모): 아버지 왼쪽에 배치
            paternalOthers.forEach((person, index) => {
                const x = fatherX - ((index + 1) * this.minSiblingSpacing);
                positions.set(person.id, { x, y });
            });

            // 외가 쪽 형제들 (이모, 외삼촌): 어머니 오른쪽에 배치
            maternalOthers.forEach((person, index) => {
                const x = motherX + ((index + 1) * this.minSiblingSpacing);
                positions.set(person.id, { x, y });
            });

            // 조부모 배치를 위한 앵커 계산
            // 친가 앵커: 아버지와 그 형제들의 중심
            let paternalCenterX = fatherX;
            if (paternalOthers.length > 0) {
                const allPaternal = [father, ...paternalOthers];
                const paternalXs = allPaternal.map(p => positions.get(p.id)?.x || 0);
                paternalCenterX = (Math.min(...paternalXs) + Math.max(...paternalXs)) / 2;
            }

            // 외가 앵커: 어머니와 그 형제들의 중심
            let maternalCenterX = motherX;
            if (maternalOthers.length > 0) {
                const allMaternal = [mother, ...maternalOthers];
                const maternalXs = allMaternal.map(p => positions.get(p.id)?.x || 0);
                maternalCenterX = (Math.min(...maternalXs) + Math.max(...maternalXs)) / 2;
            }

            return {
                paternalAnchor: { centerX: paternalCenterX },
                maternalAnchor: { centerX: maternalCenterX }
            };
        }

        // 편부모 (1명만 있는 경우)
        if (directParents.length === 1) {
            const parent = directParents[0];
            positions.set(parent.id, { x: coupleCenter, y });
            
            return {
                paternalAnchor: { centerX: coupleCenter },
                maternalAnchor: { centerX: coupleCenter }
            };
        }

        // CT의 부모가 없는 경우 (드문 케이스) - side로 그룹핑
        const paternalGroup = this.sortByBirthOrder(persons.filter(p => p.side === 'paternal'));
        const maternalGroup = this.sortByBirthOrder(persons.filter(p => p.side === 'maternal'));
        
        const spacing = this.minCoupleSpacing + this.minGroupMargin;
        const fatherX = ctAnchor.centerX - spacing / 2;
        const motherX = ctAnchor.centerX + spacing / 2;

        let paternalAnchor = { centerX: fatherX };
        if (paternalGroup.length > 0) {
            paternalAnchor = this.layoutSiblingGroup(paternalGroup, fatherX, -1, y, positions);
        }

        let maternalAnchor = { centerX: motherX };
        if (maternalGroup.length > 0) {
            maternalAnchor = this.layoutSiblingGroup(maternalGroup, motherX, -1, y, positions);
        }

        return { paternalAnchor, maternalAnchor };
    }

    calculateParentSpacing(paternalCount, maternalCount, fatherIndex, motherIndex) {
        const fatherRightSiblings = (fatherIndex >= 0) 
            ? (paternalCount - 1 - fatherIndex)
            : Math.floor((paternalCount - 1) / 2);
            
        const motherLeftSiblings = (motherIndex >= 0)
            ? motherIndex
            : Math.floor((maternalCount - 1) / 2);

        const rightExtension = fatherRightSiblings * this.minSiblingSpacing;
        const leftExtension = motherLeftSiblings * this.minSiblingSpacing;

        let spacing = rightExtension + leftExtension + this.minGroupMargin;
        spacing = Math.max(this.minCoupleSpacing, spacing);
        spacing = Math.ceil(spacing / (this.gridSnap * 2)) * (this.gridSnap * 2);
        
        return spacing;
    }

    layoutSiblingGroup(persons, anchorX, anchorIndex, y, positions) {
        if (persons.length === 0) {
            return { centerX: anchorX, leftBound: anchorX, rightBound: anchorX };
        }

        if (persons.length === 1) {
            positions.set(persons[0].id, { x: anchorX, y });
            return { centerX: anchorX, leftBound: anchorX, rightBound: anchorX };
        }

        if (anchorIndex < 0 || anchorIndex >= persons.length) {
            const groupWidth = this.calculateGroupWidth(persons.length);
            const startX = anchorX - groupWidth / 2;
            
            persons.forEach((person, index) => {
                const x = startX + (index * this.minSiblingSpacing);
                positions.set(person.id, { x, y });
            });
            
            return {
                centerX: anchorX,
                leftBound: startX,
                rightBound: startX + groupWidth
            };
        }

        const startX = anchorX - (anchorIndex * this.minSiblingSpacing);
        
        persons.forEach((person, index) => {
            const x = startX + (index * this.minSiblingSpacing);
            positions.set(person.id, { x, y });
        });

        const groupWidth = this.calculateGroupWidth(persons.length);
        
        return {
            centerX: anchorX,
            leftBound: startX,
            rightBound: startX + groupWidth
        };
    }

    layoutGrandparentsGeneration(grandparents, parentAnchor, positions, relationships, allPersons, hasGreatGrandparents) {
        const y = 100;

        if (!grandparents || grandparents.length === 0) return;

        const paternalGrandparents = grandparents.filter(p => p.side === 'paternal');
        const maternalGrandparents = grandparents.filter(p => p.side === 'maternal');

        // CRITICAL: 증조부모가 있는 경우 조부모 커플 간격 조정
        let paternalCenter = parentAnchor.paternalAnchor?.centerX || 0;
        let maternalCenter = parentAnchor.maternalAnchor?.centerX || 0;

        // 증조부모 기반 간격 계산 (부모 세대와 동일한 로직)
        if (hasGreatGrandparents && paternalGrandparents.length > 0 && maternalGrandparents.length > 0) {
            const paternalGreatGrandparents = allPersons.filter(p => p.generation === -3 && p.side === 'paternal');
            const maternalGreatGrandparents = allPersons.filter(p => p.generation === -3 && p.side === 'maternal');

            if (paternalGreatGrandparents.length > 0 && maternalGreatGrandparents.length > 0) {
                // 증조부모 출생순서 기반 확장 계산
                const paternalGGPRadius = paternalGreatGrandparents.length === 2
                    ? this.minCoupleSpacing / 2
                    : (paternalGreatGrandparents.length - 1) * this.minSiblingSpacing / 2;

                const maternalGGPRadius = maternalGreatGrandparents.length === 2
                    ? this.minCoupleSpacing / 2
                    : (maternalGreatGrandparents.length - 1) * this.minSiblingSpacing / 2;

                // 조부모 커플 간격 조정
                const adjustedSpacing = Math.max(
                    this.minCoupleSpacing,
                    paternalGGPRadius + maternalGGPRadius + this.minGroupMargin
                );

                // 부모 앵커 중심에서 조부모 배치
                const centerX = (paternalCenter + maternalCenter) / 2;
                paternalCenter = centerX - adjustedSpacing / 2;
                maternalCenter = centerX + adjustedSpacing / 2;

                console.log('[LAYOUT] 증조부모 기반 조부모 간격 조정:', {
                    증조부모친가: paternalGreatGrandparents.length,
                    증조부모외가: maternalGreatGrandparents.length,
                    조정된간격: adjustedSpacing
                });
            }
        }

        // CRITICAL FIX: 조부모 커플의 중심은 부모 세대의 친가/외가 형제 그룹의 중심과 일치
        if (paternalGrandparents.length > 0 && parentAnchor.paternalAnchor) {
            // 친가 부모들의 실제 중심 계산
            const paternalParents = allPersons
                .filter(p => p.generation === -1 && p.side === 'paternal')
                .map(p => positions.get(p.id))
                .filter(pos => pos);

            paternalCenter = parentAnchor.paternalAnchor.centerX;
            if (paternalParents.length > 0) {
                paternalCenter = paternalParents.reduce((sum, pos) => sum + pos.x, 0) / paternalParents.length;
            }

            this.layoutCoupleOrSiblings(
                paternalGrandparents,
                paternalCenter,
                y,
                positions,
                relationships
            );
        }

        if (maternalGrandparents.length > 0 && parentAnchor.maternalAnchor) {
            // 외가 부모들의 실제 중심 계산
            const maternalParents = allPersons
                .filter(p => p.generation === -1 && p.side === 'maternal')
                .map(p => positions.get(p.id))
                .filter(pos => pos);

            maternalCenter = parentAnchor.maternalAnchor.centerX;
            if (maternalParents.length > 0) {
                maternalCenter = maternalParents.reduce((sum, pos) => sum + pos.x, 0) / maternalParents.length;
            }

            this.layoutCoupleOrSiblings(
                maternalGrandparents,
                maternalCenter,
                y,
                positions,
                relationships
            );
        }

        // Return anchors for great-grandparents generation
        return {
            paternalAnchor: paternalGrandparents.length > 0 ? { centerX: paternalCenter } : null,
            maternalAnchor: maternalGrandparents.length > 0 ? { centerX: maternalCenter } : null
        };
    }

    /**
     * Layout great-grandparents generation (Generation -3)
     */
    layoutGreatGrandparentsGeneration(greatGrandparents, grandparentAnchor, positions, relationships) {
        const y = 100 - this.generationSpacing;  // One more generation up

        if (!greatGrandparents || greatGrandparents.length === 0) return;

        const paternalGreatGrandparents = greatGrandparents.filter(p => p.side === 'paternal');
        const maternalGreatGrandparents = greatGrandparents.filter(p => p.side === 'maternal');

        // 친가 증조부모: 친가 조부모의 자녀들 중심 위에 배치
        if (paternalGreatGrandparents.length > 0 && grandparentAnchor.paternalAnchor) {
            // CRITICAL: 증조부모의 실제 자녀들을 parent-child relationship에서 찾기
            const greatGrandparentIds = paternalGreatGrandparents.map(p => p.id);
            const childRel = relationships.find(r =>
                r.type === 'parent-child' &&
                r.parents.some(pid => greatGrandparentIds.includes(pid))
            );

            let paternalCenter = grandparentAnchor.paternalAnchor.centerX;

            if (childRel && childRel.children) {
                // 증조부모의 실제 자녀들 위치의 중심 계산
                const childrenPositions = childRel.children
                    .map(cid => positions.get(cid))
                    .filter(pos => pos);

                if (childrenPositions.length > 0) {
                    paternalCenter = childrenPositions.reduce((sum, pos) => sum + pos.x, 0) / childrenPositions.length;
                }
            }

            this.layoutCoupleOrSiblings(
                paternalGreatGrandparents,
                paternalCenter,
                y,
                positions,
                relationships
            );
        }

        // 외가 증조부모: 외가 조부모의 자녀들 중심 위에 배치
        if (maternalGreatGrandparents.length > 0 && grandparentAnchor.maternalAnchor) {
            // CRITICAL: 증조부모의 실제 자녀들을 parent-child relationship에서 찾기
            const greatGrandparentIds = maternalGreatGrandparents.map(p => p.id);
            const childRel = relationships.find(r =>
                r.type === 'parent-child' &&
                r.parents.some(pid => greatGrandparentIds.includes(pid))
            );

            let maternalCenter = grandparentAnchor.maternalAnchor.centerX;

            if (childRel && childRel.children) {
                // 증조부모의 실제 자녀들 위치의 중심 계산
                const childrenPositions = childRel.children
                    .map(cid => positions.get(cid))
                    .filter(pos => pos);

                if (childrenPositions.length > 0) {
                    maternalCenter = childrenPositions.reduce((sum, pos) => sum + pos.x, 0) / childrenPositions.length;
                }
            }

            this.layoutCoupleOrSiblings(
                maternalGreatGrandparents,
                maternalCenter,
                y,
                positions,
                relationships
            );
        }
    }

    layoutCoupleOrSiblings(persons, centerX, y, positions, relationships) {
        if (persons.length === 0) return;

        const couple = this.findCouple(persons, relationships);

        if (couple.length === 2) {
            const husband = couple.find(p => p.gender === 'M');
            const wife = couple.find(p => p.gender === 'F');

            if (!husband || !wife) {
                // 커플이 아닌 경우 일반 형제 그룹으로 처리
                const sorted = this.sortByBirthOrder(persons);
                this.layoutSiblingGroup(sorted, centerX, -1, y, positions);
                return;
            }

            // CRITICAL: Genogram 표준
            // - 커플만 있는 경우: centerX를 중심으로 남편(좌), 아내(우) 배치
            // - 형제가 있는 경우: 커플 중심은 centerX에 고정, 형제는 출생순서대로 좌우 배치

            if (persons.length === 2) {
                // 커플만 있는 경우
                const husbandX = centerX - this.minCoupleSpacing / 2;
                const wifeX = centerX + this.minCoupleSpacing / 2;
                positions.set(husband.id, { x: husbandX, y });
                positions.set(wife.id, { x: wifeX, y });
            } else {
                // 커플 + 형제들이 있는 경우
                // 1. 아내를 제외한 형제들만 출생 순서로 정렬
                const siblingsOnly = persons.filter(p => p.id !== wife.id);
                const sortedSiblings = this.sortByBirthOrder(siblingsOnly);

                // 2. 남편의 인덱스 찾기
                const husbandIndex = sortedSiblings.findIndex(p => p.id === husband.id);

                // 3. 커플 중심을 centerX에 배치
                const coupleCenter = centerX;
                const husbandX = coupleCenter - this.minCoupleSpacing / 2;
                const wifeX = coupleCenter + this.minCoupleSpacing / 2;

                positions.set(husband.id, { x: husbandX, y });
                positions.set(wife.id, { x: wifeX, y });

                // 4. 남편 왼쪽에 형제들 배치 (출생순서가 남편보다 앞)
                for (let i = 0; i < husbandIndex; i++) {
                    const person = sortedSiblings[i];
                    const offset = husbandIndex - i;
                    const x = husbandX - (offset * this.minSiblingSpacing);
                    positions.set(person.id, { x, y });
                }

                // 5. 아내 오른쪽에 형제들 배치 (출생순서가 남편보다 뒤)
                for (let i = husbandIndex + 1; i < sortedSiblings.length; i++) {
                    const person = sortedSiblings[i];
                    const offset = i - husbandIndex;
                    const x = wifeX + (offset * this.minSiblingSpacing);
                    positions.set(person.id, { x, y });
                }
            }
        } else {
            const sorted = this.sortByBirthOrder(persons);
            this.layoutSiblingGroup(sorted, centerX, -1, y, positions);
        }
    }

    findCouple(persons, relationships) {
        if (persons.length < 2) return [];

        const personIds = persons.map(p => p.id);
        const coupleRel = relationships.find(r =>
            r.type === 'couple' &&
            personIds.includes(r.from) &&
            personIds.includes(r.to)
        );

        if (coupleRel) {
            const person1 = persons.find(p => p.id === coupleRel.from);
            const person2 = persons.find(p => p.id === coupleRel.to);
            if (person1 && person2) {
                return [person1, person2];
            }
        }

        return [];
    }

    snapToGrid(value) {
        if (typeof value !== 'number') return value;
        return Math.round(value / this.gridSnap) * this.gridSnap;
    }
}

// Script loading confirmation
if (window.DEBUG_LOADING) {
    console.log('✓ layout.js loaded (AutoLayout class)');
}
// ============================================================================
// EMOTIONAL STYLES - GenoPro 표준 기반 감정선 스타일 정의
// ============================================================================

/**
 * GenoPro 표준을 기반으로 한 감정선 스타일
 * 가장 많이 사용되는 10가지 유형
 * 
 * Reference: https://genopro.com/genogram/emotional-relationships/
 */
const EMOTIONAL_STYLES = {
    // 1. 조화로운 관계 (Harmony) - 녹색 실선
    'harmony': { 
        color: '#10b981', 
        width: 1.8, 
        builder: 'straight',
        description: '서로를 존중하는 좋은 관계'
    },
    
    // 2. 친밀한 관계 (Close/Friendship) - 녹색 이중선
    'close-friendship': { 
        color: '#10b981', 
        width: 1.6, 
        builder: 'double',
        offset: 4,
        description: '애정과 존중을 공유하는 깊은 친밀감'
    },
    
    // 3. 거리감 (Distant) - 회색 점선
    'distant': { 
        color: '#9ca3af', 
        width: 1.5, 
        builder: 'straight', 
        dash: '8 6',
        description: '제한된 소통, 생활방식의 차이'
    },
    
    // 4. 단절 (Cutoff) - 빨강 끊어진 선
    'cutoff': { 
        color: '#ef4444', 
        width: 1.8, 
        builder: 'broken', 
        gap: 20,
        description: '완전한 관계 단절, 접촉 없음'
    },
    
    // 5. 불화 (Discord) - 주황 지그재그
    'discord': {
        color: '#f59e0b',
        width: 2.0,
        builder: 'zigzag',
        amplitude: 5,  // Reduced from 10 to 5
        step: 20,
        description: '주요 문제로 인한 의견 충돌'
    },

    // 6. 적대적 (Hostile) - 빨강 지그재그
    'hostile': {
        color: '#dc2626',
        width: 2.4,
        builder: 'zigzag',
        amplitude: 7,  // Reduced from 14 to 7
        step: 18,
        description: '격렬한 논쟁과 스트레스가 있는 관계'
    },

    // 7. 융합 (Fused) - 청록 삼중선
    'fused': {
        color: '#06b6d4',
        width: 1.6,
        builder: 'triple',
        offset: 3,
        description: '과도하게 밀착되어 의존적인 관계'
    },

    // 8. 학대 (Abuse) - 진한 빨강 지그재그
    'abuse': {
        color: '#991b1b',
        width: 2.6,
        builder: 'zigzag',
        amplitude: 8,  // Reduced from 16 to 8
        step: 14,
        description: '신체적, 정서적, 성적 학대 관계'
    },
    
    // 9. 조종 (Manipulative) - 보라 물결
    'manipulative': { 
        color: '#7c3aed', 
        width: 2.0, 
        builder: 'wavy', 
        amplitude: 10, 
        step: 16,
        description: '한쪽이 상대를 조종하는 관계'
    },
    
    // 10. 사랑 (Love) - 분홍 실선
    'love': { 
        color: '#ec4899', 
        width: 1.8, 
        builder: 'straight',
        description: '친족 간의 애정 또는 매력'
    },
    
    // 기본값
    'default': { 
        color: '#6b7280', 
        width: 1.5, 
        builder: 'straight',
        description: '정의되지 않은 관계'
    }
};

// 스타일을 전역으로 내보내기
if (typeof window !== 'undefined') {
    window.EMOTIONAL_STYLES = EMOTIONAL_STYLES;
}
// ============================================================================
// EMOTIONAL RENDERER - 감정선 렌더링 모듈
// ============================================================================

/**
 * 감정선 렌더링을 담당하는 클래스
 */
class EmotionalRenderer {
    constructor(svgRenderer) {
        this.renderer = svgRenderer;
    }

    /**
     * 감정선 관계 렌더링
     */
    renderEmotionalRelationship(rel, persons, isNew = false) {
        const from = persons.find(p => p.id === rel.from);
        const to = persons.find(p => p.id === rel.to);
        if (!from || !to) return;

        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.setAttribute('class', `emotional-group emotional-${rel.subtype}${isNew ? ' emotional-group-new' : ''}`);
        group.setAttribute('data-id', rel.id);
        
        const pathElements = this.createEmotionalPath(rel, from, to, isNew);
        pathElements.forEach(el => group.appendChild(el));
        
        this.renderer.layerEmotional.appendChild(group);
        
        // 애니메이션 종료 후 클래스 제거
        if (isNew) {
            setTimeout(() => {
                group.classList.remove('emotional-group-new');
                group.querySelectorAll('.emotional-line-connecting, .emotional-line-pulse').forEach(el => {
                    el.classList.remove('emotional-line-connecting', 'emotional-line-pulse');
                });
            }, 800);
        }
    }

    /**
     * 감정선 경로 생성
     */
    createEmotionalPath(rel, from, to, isNew = false) {
        const elements = [];
        const style = window.EMOTIONAL_STYLES[rel.subtype] || window.EMOTIONAL_STYLES.default;
        
        switch (style.builder) {
            case 'straight':
                this.buildStraightLine(elements, from, to, style, isNew);
                break;
            case 'double':
                this.buildDoubleLine(elements, from, to, style, isNew);
                break;
            case 'triple':
                this.buildTripleLine(elements, from, to, style, isNew);
                break;
            case 'zigzag':
                this.buildZigzagLine(elements, from, to, style, isNew);
                break;
            case 'wavy':
                this.buildWavyLine(elements, from, to, style, isNew);
                break;
            case 'broken':
                this.buildBrokenLine(elements, from, to, style, isNew);
                break;
            default:
                this.buildStraightLine(elements, from, to, style, isNew);
        }
        
        return elements;
    }

    /**
     * 직선 (단일선)
     */
    buildStraightLine(elements, from, to, style, isNew) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', from.x);
        line.setAttribute('y1', from.y);
        line.setAttribute('x2', to.x);
        line.setAttribute('y2', to.y);
        
        const classList = ['emotional-line', `emotional-${style.builder}`];
        if (isNew) {
            classList.push('emotional-line-connecting', 'emotional-line-pulse');
        }
        line.setAttribute('class', classList.join(' '));
        
        line.style.stroke = style.color;
        line.style.strokeWidth = `${style.width * this.renderer.emotionalStrokeWidth}px`;
        
        if (style.dash) {
            line.setAttribute('stroke-dasharray', style.dash);
        }
        
        if (isNew) {
            line.style.setProperty('--pulse-width', style.width * this.renderer.emotionalStrokeWidth);
        }
        
        elements.push(line);
    }

    /**
     * 이중선 (친밀한 관계)
     */
    buildDoubleLine(elements, from, to, style, isNew) {
        const offset = style.offset || 4;
        const perp = this.getPerpendicularOffset(from, to, offset);
        
        // 첫 번째 선
        const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line1.setAttribute('x1', from.x - perp.x);
        line1.setAttribute('y1', from.y - perp.y);
        line1.setAttribute('x2', to.x - perp.x);
        line1.setAttribute('y2', to.y - perp.y);
        this.applyLineStyle(line1, style, isNew);
        elements.push(line1);
        
        // 두 번째 선
        const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line2.setAttribute('x1', from.x + perp.x);
        line2.setAttribute('y1', from.y + perp.y);
        line2.setAttribute('x2', to.x + perp.x);
        line2.setAttribute('y2', to.y + perp.y);
        this.applyLineStyle(line2, style, isNew);
        elements.push(line2);
    }

    /**
     * 삼중선 (융합 관계)
     */
    buildTripleLine(elements, from, to, style, isNew) {
        const offset = style.offset || 3;
        const perp = this.getPerpendicularOffset(from, to, offset);
        
        // 중앙 선
        const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line1.setAttribute('x1', from.x);
        line1.setAttribute('y1', from.y);
        line1.setAttribute('x2', to.x);
        line1.setAttribute('y2', to.y);
        this.applyLineStyle(line1, style, isNew);
        elements.push(line1);
        
        // 왼쪽 선
        const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line2.setAttribute('x1', from.x - perp.x * 1.5);
        line2.setAttribute('y1', from.y - perp.y * 1.5);
        line2.setAttribute('x2', to.x - perp.x * 1.5);
        line2.setAttribute('y2', to.y - perp.y * 1.5);
        this.applyLineStyle(line2, style, isNew);
        elements.push(line2);
        
        // 오른쪽 선
        const line3 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line3.setAttribute('x1', from.x + perp.x * 1.5);
        line3.setAttribute('y1', from.y + perp.y * 1.5);
        line3.setAttribute('x2', to.x + perp.x * 1.5);
        line3.setAttribute('y2', to.y + perp.y * 1.5);
        this.applyLineStyle(line3, style, isNew);
        elements.push(line3);
    }

    /**
     * 지그재그 (갈등, 적대, 학대)
     */
    buildZigzagLine(elements, from, to, style, isNew) {
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const length = Math.hypot(dx, dy);
        const steps = Math.max(6, Math.floor(length / (style.step || 20)));
        
        let pathData = `M ${from.x} ${from.y}`;
        
        for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            const x = from.x + dx * t;
            const y = from.y + dy * t;
            const perpAmount = (i % 2 === 0 ? 1 : -1) * style.amplitude;
            const perp = this.getPerpendicularOffset(from, to, perpAmount);
            pathData += ` L ${x + perp.x} ${y + perp.y}`;
        }
        
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pathData);
        this.applyLineStyle(path, style, isNew);
        elements.push(path);
    }

    /**
     * 물결 (조종)
     */
    buildWavyLine(elements, from, to, style, isNew) {
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const length = Math.hypot(dx, dy);
        const steps = Math.max(8, Math.floor(length / (style.step || 16)));
        
        let pathData = `M ${from.x} ${from.y}`;
        
        for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            const x = from.x + dx * t;
            const y = from.y + dy * t;
            const wave = Math.sin(i * Math.PI / 2) * style.amplitude;
            const perp = this.getPerpendicularOffset(from, to, wave);
            pathData += ` L ${x + perp.x} ${y + perp.y}`;
        }
        
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pathData);
        this.applyLineStyle(path, style, isNew);
        elements.push(path);
    }

    /**
     * 끊어진 선 (단절)
     */
    buildBrokenLine(elements, from, to, style, isNew) {
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const length = Math.hypot(dx, dy);
        const gap = style.gap || 20;
        const segments = Math.floor(length / (gap * 2));
        
        let pathData = '';
        
        for (let i = 0; i < segments; i++) {
            const t1 = (i * 2 * gap) / length;
            const t2 = ((i * 2 + 1) * gap) / length;
            if (t2 > 1) break;
            
            const x1 = from.x + dx * t1;
            const y1 = from.y + dy * t1;
            const x2 = from.x + dx * t2;
            const y2 = from.y + dy * t2;
            
            pathData += `M ${x1} ${y1} L ${x2} ${y2} `;
        }
        
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pathData);
        this.applyLineStyle(path, style, isNew);
        elements.push(path);
    }

    /**
     * 선 스타일 적용
     */
    applyLineStyle(element, style, isNew) {
        const classList = ['emotional-line'];
        if (isNew) {
            classList.push('emotional-line-connecting', 'emotional-line-pulse');
        }
        element.setAttribute('class', classList.join(' '));
        
        element.style.stroke = style.color;
        element.style.strokeWidth = `${style.width * this.renderer.emotionalStrokeWidth}px`;
        element.style.fill = 'none';
        element.style.strokeLinecap = 'round';
        element.style.strokeLinejoin = 'round';
        
        if (style.dash) {
            element.setAttribute('stroke-dasharray', style.dash);
        }
        
        if (isNew) {
            element.style.setProperty('--pulse-width', style.width * this.renderer.emotionalStrokeWidth);
        }
    }

    /**
     * 수직 방향 오프셋 계산
     */
    getPerpendicularOffset(from, to, amount) {
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const length = Math.hypot(dx, dy) || 1;
        return { 
            x: -dy / length * amount, 
            y: dx / length * amount 
        };
    }

    /**
     * 감정선 미리보기 렌더링
     */
    renderPreviewLine(from, to, subtype) {
        if (!from || !to || !this.renderer.layerPreview) return;
        
        this.clearPreviewLine();
        
        const style = window.EMOTIONAL_STYLES[subtype] || window.EMOTIONAL_STYLES.default;
        
        // 임시 관계 객체 생성
        const tempRel = { subtype: subtype };
        const elements = this.createEmotionalPath(tempRel, from, to, false);
        
        // 미리보기 스타일 적용
        elements.forEach(el => {
            el.style.opacity = '0.5';
            el.style.strokeDasharray = '8 4';
            el.style.pointerEvents = 'none';
            this.renderer.layerPreview.appendChild(el);
        });
    }

    /**
     * 미리보기 제거
     */
    clearPreviewLine() {
        if (this.renderer.layerPreview) {
            this.renderer.layerPreview.innerHTML = '';
        }
    }
}

// 전역으로 내보내기
if (typeof window !== 'undefined') {
    window.EmotionalRenderer = EmotionalRenderer;
}
