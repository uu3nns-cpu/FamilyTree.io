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
            const mark = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            mark.setAttribute('x1', midX - 8);
            mark.setAttribute('y1', midY - 12);
            mark.setAttribute('x2', midX + 8);
            mark.setAttribute('y2', midY + 12);
            mark.setAttribute('class', 'separation-mark');
            mark.style.strokeWidth = `${this.relationshipStrokeWidth}px`;
            marks.push(mark);
        } else if (rel.subtype === 'divorced') {
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

    renderParentChildRelationship(rel, persons) {
        const parents = rel.parents.map(id => persons.find(p => p.id === id)).filter(p => p);
        const children = rel.children.map(id => persons.find(p => p.id === id)).filter(p => p);
        if (parents.length === 0 || children.length === 0) return;

        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.setAttribute('class', 'parent-child-group');
        const lineWidth = this.relationshipStrokeWidth;

        const coupleLineY = this.calculateCoupleLineY(parents);
        const parentCenterX = parents.reduce((sum, p) => sum + p.x, 0) / parents.length;
        const childrenCenterX = children.reduce((sum, c) => sum + c.x, 0) / children.length;
        const childrenTopY = children[0].y - this.nodeSize / 2;
        const spineY = coupleLineY + (childrenTopY - coupleLineY) * 0.6;
        
        const vLine1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        vLine1.setAttribute('x1', parentCenterX);
        vLine1.setAttribute('y1', coupleLineY);
        vLine1.setAttribute('x2', parentCenterX);
        vLine1.setAttribute('y2', spineY);
        vLine1.setAttribute('class', 'parent-child-line');
        vLine1.style.strokeWidth = `${lineWidth}px`;
        group.appendChild(vLine1);

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
        if (!this.layerGrid) return;
        if (this.gridMode === 'none') {
            this.layerGrid.innerHTML = '';
            return;
        }
        this.layerGrid.innerHTML = '';
        const spacing = this.gridSpacing || 60;
        const svgRect = this.svg.getBoundingClientRect();
        const viewWidth = svgRect.width;
        const viewHeight = svgRect.height;
        const scale = this.currentZoom;
        const visibleLeft = -this.panX / scale;
        const visibleTop = -this.panY / scale;
        const visibleRight = visibleLeft + viewWidth / scale;
        const visibleBottom = visibleTop + viewHeight / scale;
        const buffer = spacing * 20;
        const startX = Math.floor((visibleLeft - buffer) / spacing) * spacing;
        const endX = Math.ceil((visibleRight + buffer) / spacing) * spacing;
        const startY = Math.floor((visibleTop - buffer) / spacing) * spacing;
        const endY = Math.ceil((visibleBottom + buffer) / spacing) * spacing;
        const dashPattern = this.gridMode === 'dashed' ? '4 4' : '';
        const opacity = this.gridMode === 'dashed' ? 0.7 : 0.55;
        const strokeWidth = this.gridMode === 'dashed' ? 1.2 : 1.4;

        for (let x = startX; x <= endX; x += spacing) {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', x); line.setAttribute('y1', startY);
            line.setAttribute('x2', x); line.setAttribute('y2', endY);
            line.setAttribute('stroke', this.gridColor);
            line.setAttribute('stroke-width', strokeWidth);
            line.setAttribute('stroke-opacity', opacity);
            if (dashPattern) line.setAttribute('stroke-dasharray', dashPattern);
            this.layerGrid.appendChild(line);
        }
        for (let y = startY; y <= endY; y += spacing) {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', startX); line.setAttribute('y1', y);
            line.setAttribute('x2', endX); line.setAttribute('y2', y);
            line.setAttribute('stroke', this.gridColor);
            line.setAttribute('stroke-width', strokeWidth);
            line.setAttribute('stroke-opacity', opacity);
            if (dashPattern) line.setAttribute('stroke-dasharray', dashPattern);
            this.layerGrid.appendChild(line);
        }
    }

    renderEmotionalRelationship(rel, persons, isNew = false) {
        if (this.emotionalRenderer) {
            this.emotionalRenderer.renderEmotionalRelationship(rel, persons, isNew);
        }
    }

    createEmotionalPath(rel, from, to, isNew = false) {
        const elements = [];
        const x1 = from.x, y1 = from.y, x2 = to.x, y2 = to.y;
        const dx = x2 - x1, dy = y2 - y1;
        const length = Math.hypot(dx, dy);
        const style = EMOTIONAL_STYLES[rel.subtype] || EMOTIONAL_STYLES.default;
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const classList = ['emotional-line', `emotional-${rel.subtype}`];
        if (isNew) classList.push('emotional-line-connecting', 'emotional-line-pulse');
        path.setAttribute('class', classList.join(' '));
        path.style.stroke = style.color;
        path.style.strokeWidth = `${style.width}px`;
        if (isNew) path.style.setProperty('--pulse-width', style.width);
        let pathData = `M ${x1} ${y1} L ${x2} ${y2}`;
        switch (style.builder) {
            case 'zigzag': pathData = this.buildZigzagPath(from, to, style.amplitude, Math.max(6, Math.floor(length / (style.step || 20)))); break;
            case 'broken': pathData = this.buildBrokenPath(from, to, style.gap); break;
            case 'wavy': pathData = this.buildWavyPath(from, to, style.amplitude, Math.max(6, Math.floor(length / (style.step || 20)))); break;
            case 'ticks': this.buildTickPath(elements, from, to, style.tickCount, style.tickLength, style.color, style.width, isNew); break;
        }
        path.setAttribute('d', pathData);
        if (style.dash) path.setAttribute('stroke-dasharray', style.dash);
        elements.push(path);
        if (style.extra) style.extra.call(this, elements, rel, from, to);
        return elements;
    }

    setZoom(zoom) {
        this.currentZoom = zoom;
        this.updateTransform();
        this.updateGridForViewport();
    }

    updateTransform() {
        this.mainGroup.setAttribute('transform', `translate(${this.panX}, ${this.panY}) scale(${this.currentZoom})`);
        this.updateGridForViewport();
    }

    updateGridForViewport() {
        if (this.gridMode === 'none' || !this.layerGrid) return;
        this.renderGrid([]);
    }

    fitToView() {
        const bbox = this.mainGroup.getBBox();
        if (bbox.width === 0 || bbox.height === 0) return;
        this.currentZoom = 1.0;
        const svgRect = this.svg.getBoundingClientRect();
        this.panX = svgRect.width / 2 - (bbox.x + bbox.width / 2) * this.currentZoom;
        this.panY = svgRect.height / 2 - (bbox.y + bbox.height / 2) * this.currentZoom;
        this.updateTransform();
        if (window.genogramApp && window.genogramApp.toolbar) {
            window.genogramApp.toolbar.updateZoomDisplay(this.currentZoom);
        }
    }

    centerOnCT(persons) {
        if (this.disableAutoCenter) return;
        const ct = persons.find(p => p.isCT);
        if (!ct) { this.fitToView(); return; }
        this.currentZoom = 1.0;
        const svgRect = this.svg.getBoundingClientRect();
        this.panX = svgRect.width / 2 - ct.x * this.currentZoom;
        this.panY = svgRect.height / 2 - ct.y * this.currentZoom;
        this.updateTransform();
        if (window.genogramApp && window.genogramApp.toolbar) {
            window.genogramApp.toolbar.updateZoomDisplay(this.currentZoom);
        }
    }

    svgToScreen(svgX, svgY) {
        const svgRect = this.svg.getBoundingClientRect();
        return {
            x: svgRect.left + this.panX + svgX * this.currentZoom,
            y: svgRect.top + this.panY + svgY * this.currentZoom
        };
    }

    buildZigzagPath(from, to, amplitude, steps) {
        const dx = to.x - from.x, dy = to.y - from.y;
        let path = `M ${from.x} ${from.y}`;
        for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            const x = from.x + dx * t, y = from.y + dy * t;
            const perp = this.perpendicularOffset(from, to, (i % 2 === 0 ? 1 : -1) * amplitude);
            path += ` L ${x + perp.x} ${y + perp.y}`;
        }
        return path;
    }

    perpendicularOffset(from, to, amount) {
        const dx = to.x - from.x, dy = to.y - from.y;
        const length = Math.hypot(dx, dy) || 1;
        return { x: -dy / length * amount, y: dx / length * amount };
    }

    buildBrokenPath(from, to, gap) {
        const dx = to.x - from.x, dy = to.y - from.y;
        const length = Math.hypot(dx, dy);
        const segments = Math.floor(length / (gap * 2));
        let path = '';
        for (let i = 0; i < segments; i++) {
            const t1 = (i * 2 * gap) / length, t2 = ((i * 2 + 1) * gap) / length;
            if (t2 > 1) break;
            path += `M ${from.x + dx * t1} ${from.y + dy * t1} L ${from.x + dx * t2} ${from.y + dy * t2} `;
        }
        return path;
    }

    buildWavyPath(from, to, amplitude, steps) {
        const dx = to.x - from.x, dy = to.y - from.y;
        let path = `M ${from.x} ${from.y}`;
        for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            const x = from.x + dx * t, y = from.y + dy * t;
            const wave = Math.sin(i * Math.PI) * amplitude;
            const perp = this.perpendicularOffset(from, to, wave);
            path += ` L ${x + perp.x} ${y + perp.y}`;
        }
        return path;
    }

    buildTickPath(elements, from, to, tickCount, tickLength, color, width, isNew = false) {
        const dx = to.x - from.x, dy = to.y - from.y;
        const mainLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        mainLine.setAttribute('x1', from.x); mainLine.setAttribute('y1', from.y);
        mainLine.setAttribute('x2', to.x); mainLine.setAttribute('y2', to.y);
        const classList = ['emotional-line'];
        if (isNew) classList.push('emotional-line-connecting', 'emotional-line-pulse');
        mainLine.setAttribute('class', classList.join(' '));
        mainLine.style.stroke = color;
        mainLine.style.strokeWidth = `${width * this.emotionalStrokeWidth}px`;
        if (isNew) mainLine.style.setProperty('--pulse-width', width * this.emotionalStrokeWidth);
        elements.push(mainLine);
        for (let i = 1; i <= tickCount; i++) {
            const t = i / (tickCount + 1);
            const x = from.x + dx * t, y = from.y + dy * t;
            const perp = this.perpendicularOffset(from, to, tickLength);
            const tick = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            tick.setAttribute('x1', x - perp.x); tick.setAttribute('y1', y - perp.y);
            tick.setAttribute('x2', x + perp.x); tick.setAttribute('y2', y + perp.y);
            tick.setAttribute('class', 'emotional-tick');
            tick.style.stroke = color;
            tick.style.strokeWidth = `${width * this.emotionalStrokeWidth}px`;
            elements.push(tick);
        }
    }

    addParallelLine(elements, from, to, offset) {
        const perp = this.perpendicularOffset(from, to, offset);
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', from.x + perp.x); line.setAttribute('y1', from.y + perp.y);
        line.setAttribute('x2', to.x + perp.x); line.setAttribute('y2', to.y + perp.y);
        line.setAttribute('class', 'emotional-line');
        elements.push(line);
    }

    renderPreviewLine(from, to, subtype) {
        if (this.emotionalRenderer) this.emotionalRenderer.renderPreviewLine(from, to, subtype);
    }

    clearPreviewLine() {
        if (this.emotionalRenderer) this.emotionalRenderer.clearPreviewLine();
    }

    showEmptyCanvasHint() {
        this.hideHints();
        const hintGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        hintGroup.setAttribute('id', 'canvas-hint');
        hintGroup.setAttribute('class', 'canvas-hint');
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', '-200'); rect.setAttribute('y', '-80');
        rect.setAttribute('width', '400'); rect.setAttribute('height', '160');
        rect.setAttribute('rx', '12');
        rect.setAttribute('fill', 'var(--surface-base, #ffffff)');
        rect.setAttribute('stroke', 'var(--primary, #3b82f6)');
        rect.setAttribute('stroke-width', '2');
        rect.setAttribute('opacity', '0.95');
        rect.setAttribute('filter', 'drop-shadow(0 4px 12px rgba(0,0,0,0.1))');
        hintGroup.appendChild(rect);
        const icon = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        icon.setAttribute('x', '0'); icon.setAttribute('y', '-35');
        icon.setAttribute('text-anchor', 'middle'); icon.setAttribute('font-size', '32');
        icon.textContent = '👋';
        hintGroup.appendChild(icon);
        const title = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        title.setAttribute('x', '0'); title.setAttribute('y', '0');
        title.setAttribute('text-anchor', 'middle'); title.setAttribute('font-size', '18');
        title.setAttribute('font-weight', 'bold');
        title.setAttribute('fill', 'var(--text-primary, #1f2937)');
        title.textContent = 'Get Started';
        hintGroup.appendChild(title);
        const text1 = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text1.setAttribute('x', '0'); text1.setAttribute('y', '30');
        text1.setAttribute('text-anchor', 'middle'); text1.setAttribute('font-size', '14');
        text1.setAttribute('fill', 'var(--text-secondary, #6b7280)');
        text1.textContent = 'Select a template from the left, or';
        hintGroup.appendChild(text1);
        const text2 = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text2.setAttribute('x', '0'); text2.setAttribute('y', '52');
        text2.setAttribute('text-anchor', 'middle'); text2.setAttribute('font-size', '14');
        text2.setAttribute('fill', 'var(--text-secondary, #6b7280)');
        text2.textContent = 'Click here to add your first person';
        hintGroup.appendChild(text2);
        this.layerNodes.appendChild(hintGroup);
    }

    hideHints() {
        const existingHint = this.layerNodes.querySelector('#canvas-hint');
        if (existingHint) existingHint.remove();
    }
}

// ============================================================================
// LAYOUT ENGINE - AutoLayout (버그 수정: BUG-01~06, 2025-06)
// ============================================================================

class AutoLayout {
    constructor() {
        this.nodeSize = 60;
        this.minSiblingSpacing = 120;
        this.minCoupleSpacing = 180;
        this.minGroupMargin = 120;
        this.minFamilyGap = 300;
        this.generationSpacing = 140;
        this.gridSnap = 30;
        this.canvasCenter = 500;
    }

    getBirthOrderValue(person) {
        if (!person) return 0;
        const { birthOrder } = person;
        if (typeof birthOrder === 'number' && Number.isFinite(birthOrder)) return birthOrder;
        if (typeof birthOrder === 'string') {
            const parsed = parseInt(birthOrder, 10);
            if (!Number.isNaN(parsed)) return parsed;
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

    findSpouse(personId, relationships, allPersons) {
        const coupleRel = relationships.find(r =>
            r.type === 'couple' && (r.from === personId || r.to === personId)
        );
        if (!coupleRel) return null;
        const spouseId = coupleRel.from === personId ? coupleRel.to : coupleRel.from;
        return allPersons.find(p => p.id === spouseId);
    }

    // -----------------------------------------------------------------------
    // [FIX BUG-05] groupByGeneration: generation이 undefined/NaN이면 0으로 fallback
    // -----------------------------------------------------------------------
    groupByGeneration(persons) {
        const generations = new Map();
        persons.forEach(person => {
            const gen = (typeof person.generation === 'number' && Number.isFinite(person.generation))
                ? person.generation
                : 0;
            if (!generations.has(gen)) generations.set(gen, []);
            generations.get(gen).push(person);
        });
        return generations;
    }

    // -----------------------------------------------------------------------
    // [FIX BUG-06] recalculateGenerations: layout() 시작 시 BFS로 generation 재계산
    // CT 기준으로 couple→배우자(동세대), parent-child→자녀(+1)/부모(-1) BFS 전파
    // -----------------------------------------------------------------------
    recalculateGenerations(persons, relationships) {
        const ct = persons.find(p => p.isCT);
        if (!ct) return;

        const genMap = new Map();
        genMap.set(ct.id, 0);

        const coupleRels = relationships.filter(r => r.type === 'couple');
        const parentChildRels = relationships.filter(r => r.type === 'parent-child');

        const queue = [ct.id];
        const visited = new Set([ct.id]);

        while (queue.length > 0) {
            const currentId = queue.shift();
            const currentGen = genMap.get(currentId);

            // 배우자: 같은 세대
            coupleRels.forEach(r => {
                const otherId = r.from === currentId ? r.to : (r.to === currentId ? r.from : null);
                if (otherId && !visited.has(otherId)) {
                    genMap.set(otherId, currentGen);
                    visited.add(otherId);
                    queue.push(otherId);
                }
            });

            // 자녀: currentGen + 1
            parentChildRels.forEach(r => {
                if (r.parents.includes(currentId)) {
                    r.children.forEach(childId => {
                        if (!visited.has(childId)) {
                            genMap.set(childId, currentGen + 1);
                            visited.add(childId);
                            queue.push(childId);
                        }
                    });
                }
                // 부모: currentGen - 1
                if (r.children.includes(currentId)) {
                    r.parents.forEach(parentId => {
                        if (!visited.has(parentId)) {
                            genMap.set(parentId, currentGen - 1);
                            visited.add(parentId);
                            queue.push(parentId);
                        }
                    });
                }
            });
        }

        // persons에 반영
        persons.forEach(p => {
            if (genMap.has(p.id)) p.generation = genMap.get(p.id);
        });
    }

    // -----------------------------------------------------------------------
    // [FIX BUG-07] normalizePositions: 최소 Y를 60px 이상으로 보정 (증조부모 음수 방지)
    // -----------------------------------------------------------------------
    normalizePositions(positions) {
        if (positions.size === 0) return;
        const minY = Math.min(...Array.from(positions.values()).map(p => p.y));
        if (minY < 60) {
            const shift = 60 - minY;
            positions.forEach((pos, id) => {
                positions.set(id, { x: pos.x, y: pos.y + shift });
            });
        }
    }

    /**
     * Main layout function
     * [FIX BUG-01] centerX 파라미터로 동적 canvasCenter 지원
     * [FIX BUG-06] recalculateGenerations() 추가
     * [FIX BUG-07] normalizePositions() 추가
     * [FIX BUG-04] snap 후 충돌 감지
     */
    layout(persons, relationships, centerX = 500) {
        // [FIX BUG-01] 외부에서 SVG 너비 기반 centerX를 전달받아 사용
        this.canvasCenter = centerX;

        // [FIX BUG-06] 정렬 전 generation 재계산 (동적 추가 누적 오류 방지)
        this.recalculateGenerations(persons, relationships);

        const generations = this.groupByGeneration(persons);
        const positions = new Map();
        const anchors = new Map();

        const hasGrandparents = generations.has(-2) && generations.get(-2).length > 0;

        // STEP 1: CT generation (0)
        const ctGen = generations.get(0);
        const ctAnchor = this.layoutCTGeneration(ctGen, positions, relationships);
        anchors.set(0, ctAnchor);

        // STEP 2: 자녀 (1)
        const childGen = generations.get(1);
        const childrenAnchor = this.layoutChildrenGeneration(childGen, positions, ctAnchor);
        anchors.set(1, childrenAnchor);

        // STEP 3: 부모 (-1)
        const parentGen = generations.get(-1);
        const parentAnchor = this.layoutParentsGeneration(
            parentGen, ctAnchor, positions, relationships, persons, hasGrandparents
        );
        anchors.set(-1, parentAnchor);

        // STEP 4: 조부모 (-2)
        const grandparentGen = generations.get(-2);
        const greatGrandparentGen = generations.get(-3);
        const hasGreatGrandparents = greatGrandparentGen && greatGrandparentGen.length > 0;

        const grandparentAnchor = this.layoutGrandparentsGeneration(
            grandparentGen, parentAnchor, positions, relationships, persons, hasGreatGrandparents
        );

        // STEP 5: 증조부모 (-3)
        if (hasGreatGrandparents && grandparentAnchor) {
            this.layoutGreatGrandparentsGeneration(
                greatGrandparentGen, grandparentAnchor, positions, relationships
            );
        }

        // [FIX BUG-07] Y 음수 보정: 증조부모 세대가 화면 위로 잘리지 않도록
        this.normalizePositions(positions);

        // [FIX BUG-04] snap 후 동일 좌표 충돌 감지 및 한 칸 오프셋 처리
        const usedPositions = new Map();
        persons.forEach(person => {
            const pos = positions.get(person.id);
            if (!pos) return;
            let snappedX = this.snapToGrid(pos.x);
            const snappedY = this.snapToGrid(pos.y);
            const key = `${snappedX}_${snappedY}`;
            if (usedPositions.has(key)) {
                snappedX += this.gridSnap; // 충돌 시 오른쪽으로 한 칸
            }
            usedPositions.set(`${snappedX}_${snappedY}`, person.id);
            person.x = snappedX;
            person.y = snappedY;
        });

        return positions;
    }

    layoutChildrenGeneration(persons, positions, ctAnchor) {
        const y = 100 + (3 * this.generationSpacing);
        const coupleCenter = ctAnchor ? ctAnchor.coupleCenterX : this.canvasCenter;

        if (!persons || persons.length === 0) {
            return { centerX: coupleCenter, leftBound: coupleCenter, rightBound: coupleCenter, count: 0 };
        }

        const sorted = this.sortByBirthOrder(persons);
        const groupWidth = this.calculateGroupWidth(sorted.length);
        const startX = coupleCenter - groupWidth / 2;

        sorted.forEach((person, index) => {
            positions.set(person.id, { x: startX + (index * this.minSiblingSpacing), y });
        });

        return { centerX: coupleCenter, leftBound: startX, rightBound: startX + groupWidth, count: sorted.length };
    }

    layoutCTGeneration(persons, positions, relationships) {
        const y = 100 + (2 * this.generationSpacing);

        if (!persons || persons.length === 0) {
            return { centerX: this.canvasCenter, coupleCenterX: this.canvasCenter, leftBound: this.canvasCenter, rightBound: this.canvasCenter };
        }

        const ct = persons.find(p => p.isCT);
        const spouse = ct ? this.findSpouse(ct.id, relationships, persons) : null;
        const siblings = persons.filter(p => !p.isCT && (!spouse || p.id !== spouse.id) && p.side === 'both');

        if (ct && spouse) {
            const siblingGroup = [...siblings, ct];
            const sortedSiblings = this.sortByBirthOrder(siblingGroup);
            const siblingGroupWidth = this.calculateGroupWidth(sortedSiblings.length);
            const spouseGap = this.minGroupMargin;
            const totalWidth = siblingGroupWidth + spouseGap;
            const siblingStartX = this.canvasCenter - totalWidth / 2;

            let ctX = this.canvasCenter;
            sortedSiblings.forEach((person, index) => {
                const x = siblingStartX + (index * this.minSiblingSpacing);
                positions.set(person.id, { x, y });
                if (person.id === ct.id) ctX = x;
            });

            const spouseX = siblingStartX + siblingGroupWidth + spouseGap;
            positions.set(spouse.id, { x: spouseX, y });
            const coupleCenterX = (ctX + spouseX) / 2;

            return { centerX: ctX, coupleCenterX, leftBound: siblingStartX, rightBound: spouseX };

        } else if (ct) {
            if (siblings.length === 0) {
                positions.set(ct.id, { x: this.canvasCenter, y });
                return { centerX: this.canvasCenter, coupleCenterX: this.canvasCenter, leftBound: this.canvasCenter, rightBound: this.canvasCenter };
            } else {
                const allSiblings = [...siblings, ct];
                const sorted = this.sortByBirthOrder(allSiblings);
                const groupWidth = this.calculateGroupWidth(sorted.length);
                const startX = this.canvasCenter - groupWidth / 2;
                let ctX = this.canvasCenter;
                sorted.forEach((person, index) => {
                    const x = startX + (index * this.minSiblingSpacing);
                    positions.set(person.id, { x, y });
                    if (person.id === ct.id) ctX = x;
                });
                return { centerX: ctX, coupleCenterX: ctX, leftBound: startX, rightBound: startX + groupWidth };
            }
        }

        return { centerX: this.canvasCenter, coupleCenterX: this.canvasCenter, leftBound: this.canvasCenter, rightBound: this.canvasCenter };
    }

    layoutParentsGeneration(persons, ctAnchor, positions, relationships, allPersons, hasGrandparents) {
        const y = 100 + (1 * this.generationSpacing);

        if (!persons || persons.length === 0) {
            return { paternalAnchor: { centerX: ctAnchor.centerX }, maternalAnchor: { centerX: ctAnchor.centerX } };
        }

        const ct = allPersons.find(p => p.isCT);
        let directParents = [];

        if (ct) {
            const parentRel = relationships.find(r => r.type === 'parent-child' && r.children.includes(ct.id));
            if (parentRel) {
                directParents = parentRel.parents.map(pid => allPersons.find(p => p.id === pid)).filter(p => p);
            }
        }

        let coupleCenter = ctAnchor.centerX;

        // [FIX LAYOUT-03] siblingRel을 함수 스코프 최상단으로 끌어올려 4순위 분기에서도 참조 가능하게 함
        const siblingRel = ct
            ? relationships.find(r => r.type === 'parent-child' && r.children.includes(ct.id))
            : null;

        if (ct) {
            if (siblingRel) {
                const allChildren = siblingRel.children
                    .map(cid => positions.get(cid))
                    .filter(pos => pos && typeof pos.x === 'number');
                if (allChildren.length > 0) {
                    coupleCenter = allChildren.reduce((sum, pos) => sum + pos.x, 0) / allChildren.length;
                }
            }
        }

        if (directParents.length === 2) {
            const [parent1, parent2] = directParents;
            const father = parent1.gender === 'M' ? parent1 : parent2;
            const mother = parent1.gender === 'M' ? parent2 : parent1;

            const otherPersons = persons.filter(p => !directParents.some(dp => dp.id === p.id));
            const paternalOthers = this.sortByBirthOrder(otherPersons.filter(p => p.side === 'paternal'));
            const maternalOthers = this.sortByBirthOrder(otherPersons.filter(p => p.side === 'maternal'));

            let coupleSpacing = this.minCoupleSpacing;

            const paternalGrandparents = hasGrandparents ? allPersons.filter(p => p.generation === -2 && p.side === 'paternal') : [];
            const maternalGrandparents = hasGrandparents ? allPersons.filter(p => p.generation === -2 && p.side === 'maternal') : [];

            if (paternalOthers.length > 0 && maternalOthers.length > 0) {
                const paternalWidth = (paternalOthers.length + 1) * this.minSiblingSpacing;
                const maternalWidth = (maternalOthers.length + 1) * this.minSiblingSpacing;
                coupleSpacing = Math.max(this.minCoupleSpacing, paternalWidth + maternalWidth + this.minFamilyGap);
            } else if (paternalOthers.length > 0) {
                coupleSpacing = Math.max(this.minCoupleSpacing, paternalOthers.length * this.minSiblingSpacing + this.minGroupMargin);
            } else if (maternalOthers.length > 0) {
                coupleSpacing = Math.max(this.minCoupleSpacing, maternalOthers.length * this.minSiblingSpacing + this.minGroupMargin);
            }
            // [FIX LAYOUT-03] 4순위: 자녀 그룹 실제 X 범위 기반 단순화 (CANVAS_LAYOUT_RULES.md §4-2)
            else if (paternalGrandparents.length > 0 && maternalGrandparents.length > 0) {
                if (siblingRel) {
                    const allChildrenX = siblingRel.children
                        .map(cid => positions.get(cid)?.x)
                        .filter(x => typeof x === 'number');
                    const childrenSpan = allChildrenX.length > 1
                        ? Math.max(...allChildrenX) - Math.min(...allChildrenX)
                        : 0;
                    coupleSpacing = Math.max(
                        this.minCoupleSpacing,
                        childrenSpan + this.minGroupMargin
                    );
                }
            }

            const fatherX = coupleCenter - coupleSpacing / 2;
            const motherX = coupleCenter + coupleSpacing / 2;
            positions.set(father.id, { x: fatherX, y });
            positions.set(mother.id, { x: motherX, y });

            paternalOthers.forEach((person, index) => {
                positions.set(person.id, { x: fatherX - ((index + 1) * this.minSiblingSpacing), y });
            });
            maternalOthers.forEach((person, index) => {
                positions.set(person.id, { x: motherX + ((index + 1) * this.minSiblingSpacing), y });
            });

            let paternalCenterX = fatherX;
            if (paternalOthers.length > 0) {
                const allPaternal = [father, ...paternalOthers];
                const paternalXs = allPaternal.map(p => positions.get(p.id)?.x || 0);
                paternalCenterX = (Math.min(...paternalXs) + Math.max(...paternalXs)) / 2;
            }
            let maternalCenterX = motherX;
            if (maternalOthers.length > 0) {
                const allMaternal = [mother, ...maternalOthers];
                const maternalXs = allMaternal.map(p => positions.get(p.id)?.x || 0);
                maternalCenterX = (Math.min(...maternalXs) + Math.max(...maternalXs)) / 2;
            }

            return { paternalAnchor: { centerX: paternalCenterX }, maternalAnchor: { centerX: maternalCenterX } };
        }

        if (directParents.length === 1) {
            const parent = directParents[0];
            positions.set(parent.id, { x: coupleCenter, y });
            return { paternalAnchor: { centerX: coupleCenter }, maternalAnchor: { centerX: coupleCenter } };
        }

        const paternalGroup = this.sortByBirthOrder(persons.filter(p => p.side === 'paternal'));
        const maternalGroup = this.sortByBirthOrder(persons.filter(p => p.side === 'maternal'));
        const spacing = this.minCoupleSpacing + this.minGroupMargin;
        const fatherX = ctAnchor.centerX - spacing / 2;
        const motherX = ctAnchor.centerX + spacing / 2;

        let paternalAnchor = { centerX: fatherX };
        if (paternalGroup.length > 0) paternalAnchor = this.layoutSiblingGroup(paternalGroup, fatherX, -1, y, positions);
        let maternalAnchor = { centerX: motherX };
        if (maternalGroup.length > 0) maternalAnchor = this.layoutSiblingGroup(maternalGroup, motherX, -1, y, positions);

        return { paternalAnchor, maternalAnchor };
    }

    calculateParentSpacing(paternalCount, maternalCount, fatherIndex, motherIndex) {
        const fatherRightSiblings = (fatherIndex >= 0) ? (paternalCount - 1 - fatherIndex) : Math.floor((paternalCount - 1) / 2);
        const motherLeftSiblings = (motherIndex >= 0) ? motherIndex : Math.floor((maternalCount - 1) / 2);
        let spacing = (fatherRightSiblings * this.minSiblingSpacing) + (motherLeftSiblings * this.minSiblingSpacing) + this.minGroupMargin;
        spacing = Math.max(this.minCoupleSpacing, spacing);
        spacing = Math.ceil(spacing / (this.gridSnap * 2)) * (this.gridSnap * 2);
        return spacing;
    }

    layoutSiblingGroup(persons, anchorX, anchorIndex, y, positions) {
        if (persons.length === 0) return { centerX: anchorX, leftBound: anchorX, rightBound: anchorX };
        if (persons.length === 1) {
            positions.set(persons[0].id, { x: anchorX, y });
            return { centerX: anchorX, leftBound: anchorX, rightBound: anchorX };
        }
        if (anchorIndex < 0 || anchorIndex >= persons.length) {
            const groupWidth = this.calculateGroupWidth(persons.length);
            const startX = anchorX - groupWidth / 2;
            persons.forEach((person, index) => {
                positions.set(person.id, { x: startX + (index * this.minSiblingSpacing), y });
            });
            return { centerX: anchorX, leftBound: startX, rightBound: startX + groupWidth };
        }
        const startX = anchorX - (anchorIndex * this.minSiblingSpacing);
        persons.forEach((person, index) => {
            positions.set(person.id, { x: startX + (index * this.minSiblingSpacing), y });
        });
        return { centerX: anchorX, leftBound: startX, rightBound: startX + this.calculateGroupWidth(persons.length) };
    }

    layoutGrandparentsGeneration(grandparents, parentAnchor, positions, relationships, allPersons, hasGreatGrandparents) {
        const y = 100;
        if (!grandparents || grandparents.length === 0) return;

        const paternalGrandparents = grandparents.filter(p => p.side === 'paternal');
        const maternalGrandparents = grandparents.filter(p => p.side === 'maternal');

        let paternalCenter = parentAnchor.paternalAnchor?.centerX || 0;
        let maternalCenter = parentAnchor.maternalAnchor?.centerX || 0;

        if (hasGreatGrandparents && paternalGrandparents.length > 0 && maternalGrandparents.length > 0) {
            const pGGP = allPersons.filter(p => p.generation === -3 && p.side === 'paternal');
            const mGGP = allPersons.filter(p => p.generation === -3 && p.side === 'maternal');
            if (pGGP.length > 0 && mGGP.length > 0) {
                const paternalGGPRadius = pGGP.length === 2 ? this.minCoupleSpacing / 2 : (pGGP.length - 1) * this.minSiblingSpacing / 2;
                const maternalGGPRadius = mGGP.length === 2 ? this.minCoupleSpacing / 2 : (mGGP.length - 1) * this.minSiblingSpacing / 2;
                const adjustedSpacing = Math.max(this.minCoupleSpacing, paternalGGPRadius + maternalGGPRadius + this.minGroupMargin);
                const centerX = (paternalCenter + maternalCenter) / 2;
                paternalCenter = centerX - adjustedSpacing / 2;
                maternalCenter = centerX + adjustedSpacing / 2;
            }
        }

        if (paternalGrandparents.length > 0 && parentAnchor.paternalAnchor) {
            const paternalParents = allPersons.filter(p => p.generation === -1 && p.side === 'paternal').map(p => positions.get(p.id)).filter(pos => pos);
            paternalCenter = parentAnchor.paternalAnchor.centerX;
            if (paternalParents.length > 0) {
                paternalCenter = paternalParents.reduce((sum, pos) => sum + pos.x, 0) / paternalParents.length;
            }
            this.layoutCoupleOrSiblings(paternalGrandparents, paternalCenter, y, positions, relationships);
        }

        if (maternalGrandparents.length > 0 && parentAnchor.maternalAnchor) {
            const maternalParents = allPersons.filter(p => p.generation === -1 && p.side === 'maternal').map(p => positions.get(p.id)).filter(pos => pos);
            maternalCenter = parentAnchor.maternalAnchor.centerX;
            if (maternalParents.length > 0) {
                maternalCenter = maternalParents.reduce((sum, pos) => sum + pos.x, 0) / maternalParents.length;
            }
            this.layoutCoupleOrSiblings(maternalGrandparents, maternalCenter, y, positions, relationships);
        }

        return {
            paternalAnchor: paternalGrandparents.length > 0 ? { centerX: paternalCenter } : null,
            maternalAnchor: maternalGrandparents.length > 0 ? { centerX: maternalCenter } : null
        };
    }

    layoutGreatGrandparentsGeneration(greatGrandparents, grandparentAnchor, positions, relationships) {
        const y = 100 - this.generationSpacing;
        if (!greatGrandparents || greatGrandparents.length === 0) return;

        const paternalGGP = greatGrandparents.filter(p => p.side === 'paternal');
        const maternalGGP = greatGrandparents.filter(p => p.side === 'maternal');

        if (paternalGGP.length > 0 && grandparentAnchor.paternalAnchor) {
            const ids = paternalGGP.map(p => p.id);
            const childRel = relationships.find(r => r.type === 'parent-child' && r.parents.some(pid => ids.includes(pid)));
            let paternalCenter = grandparentAnchor.paternalAnchor.centerX;
            if (childRel && childRel.children) {
                const childPos = childRel.children.map(cid => positions.get(cid)).filter(pos => pos);
                if (childPos.length > 0) paternalCenter = childPos.reduce((sum, pos) => sum + pos.x, 0) / childPos.length;
            }
            this.layoutCoupleOrSiblings(paternalGGP, paternalCenter, y, positions, relationships);
        }

        if (maternalGGP.length > 0 && grandparentAnchor.maternalAnchor) {
            const ids = maternalGGP.map(p => p.id);
            const childRel = relationships.find(r => r.type === 'parent-child' && r.parents.some(pid => ids.includes(pid)));
            let maternalCenter = grandparentAnchor.maternalAnchor.centerX;
            if (childRel && childRel.children) {
                const childPos = childRel.children.map(cid => positions.get(cid)).filter(pos => pos);
                if (childPos.length > 0) maternalCenter = childPos.reduce((sum, pos) => sum + pos.x, 0) / childPos.length;
            }
            this.layoutCoupleOrSiblings(maternalGGP, maternalCenter, y, positions, relationships);
        }
    }

    layoutCoupleOrSiblings(persons, centerX, y, positions, relationships) {
        if (persons.length === 0) return;
        const couple = this.findCouple(persons, relationships);

        if (couple.length === 2) {
            const husband = couple.find(p => p.gender === 'M');
            const wife = couple.find(p => p.gender === 'F');

            if (!husband || !wife) {
                this.layoutSiblingGroup(this.sortByBirthOrder(persons), centerX, -1, y, positions);
                return;
            }

            if (persons.length === 2) {
                positions.set(husband.id, { x: centerX - this.minCoupleSpacing / 2, y });
                positions.set(wife.id, { x: centerX + this.minCoupleSpacing / 2, y });
            } else {
                const siblingsOnly = persons.filter(p => p.id !== wife.id);
                const sortedSiblings = this.sortByBirthOrder(siblingsOnly);
                const husbandIndex = sortedSiblings.findIndex(p => p.id === husband.id);
                const husbandX = centerX - this.minCoupleSpacing / 2;
                const wifeX = centerX + this.minCoupleSpacing / 2;
                positions.set(husband.id, { x: husbandX, y });
                positions.set(wife.id, { x: wifeX, y });

                for (let i = 0; i < husbandIndex; i++) {
                    const offset = husbandIndex - i;
                    positions.set(sortedSiblings[i].id, { x: husbandX - (offset * this.minSiblingSpacing), y });
                }
                for (let i = husbandIndex + 1; i < sortedSiblings.length; i++) {
                    const offset = i - husbandIndex - 1; // [BUG-LAYOUT-03] -1 보정: 아내 바로 오른쪽 형제가 wifeX+0에서 시작
                    positions.set(sortedSiblings[i].id, { x: wifeX + (offset * this.minSiblingSpacing), y });
                }
            }
        } else {
            this.layoutSiblingGroup(this.sortByBirthOrder(persons), centerX, -1, y, positions);
        }
    }

    findCouple(persons, relationships) {
        if (persons.length < 2) return [];
        const personIds = persons.map(p => p.id);
        const coupleRel = relationships.find(r => r.type === 'couple' && personIds.includes(r.from) && personIds.includes(r.to));
        if (coupleRel) {
            const p1 = persons.find(p => p.id === coupleRel.from);
            const p2 = persons.find(p => p.id === coupleRel.to);
            if (p1 && p2) return [p1, p2];
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

const EMOTIONAL_STYLES = {
    'harmony': { color: '#10b981', width: 1.8, builder: 'straight', description: '서로를 존중하는 좋은 관계' },
    'close-friendship': { color: '#10b981', width: 1.6, builder: 'double', offset: 4, description: '애정과 존중을 공유하는 깊은 친밀감' },
    'distant': { color: '#9ca3af', width: 1.5, builder: 'straight', dash: '8 6', description: '제한된 소통, 생활방식의 차이' },
    'cutoff': { color: '#ef4444', width: 1.8, builder: 'broken', gap: 20, description: '완전한 관계 단절, 접촉 없음' },
    'discord': { color: '#f59e0b', width: 2.0, builder: 'zigzag', amplitude: 5, step: 20, description: '주요 문제로 인한 의견 충돌' },
    'hostile': { color: '#dc2626', width: 2.4, builder: 'zigzag', amplitude: 7, step: 18, description: '격렬한 논쟁과 스트레스가 있는 관계' },
    'fused': { color: '#06b6d4', width: 1.6, builder: 'triple', offset: 3, description: '과도하게 밀착되어 의존적인 관계' },
    'abuse': { color: '#991b1b', width: 2.6, builder: 'zigzag', amplitude: 8, step: 14, description: '신체적, 정서적, 성적 학대 관계' },
    'manipulative': { color: '#7c3aed', width: 2.0, builder: 'wavy', amplitude: 10, step: 16, description: '한쪽이 상대를 조종하는 관계' },
    'love':             { color: '#ec4899', width: 1.8, builder: 'straight', description: '친족 간의 애정 또는 매력' },

    // ── 신버전 키 alias (js/canvas/EmotionalOperations.js 기준) ──────────────
    // [BUG-ARCH-03 / BUG-EMO-01] 신버전 subtype 키를 구버전 스타일로 매핑
    // 저장된 JSON에 신버전 키가 있어도 default fallback 없이 올바르게 렌더링됩니다.
    'close':            { color: '#10b981', width: 1.6, builder: 'double', offset: 4, description: '친밀한 관계 (close-friendship 동의어)' },
    'conflict':         { color: '#f59e0b', width: 2.0, builder: 'zigzag', amplitude: 5, step: 20, description: '갈등 (discord 동의어)' },
    'abuse-physical':   { color: '#991b1b', width: 2.6, builder: 'zigzag', amplitude: 8, step: 14, description: '신체적 학대' },
    'abuse-emotional':  { color: '#7f1d1d', width: 2.2, builder: 'zigzag', amplitude: 7, step: 14, description: '정서적 학대' },
    'abuse-sexual':     { color: '#450a0a', width: 2.8, builder: 'zigzag', amplitude: 9, step: 12, description: '성적 학대' },
    'neglect':          { color: '#78350f', width: 1.8, builder: 'straight', dash: '4 4', description: '방임' },

    'default':          { color: '#6b7280', width: 1.5, builder: 'straight', description: '정의되지 않은 관계' }
};

if (typeof window !== 'undefined') {
    window.EMOTIONAL_STYLES = EMOTIONAL_STYLES;
}

// ============================================================================
// EMOTIONAL RENDERER - 감정선 렌더링 모듈
// ============================================================================

class EmotionalRenderer {
    constructor(svgRenderer) {
        this.renderer = svgRenderer;
    }

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

        if (isNew) {
            setTimeout(() => {
                group.classList.remove('emotional-group-new');
                group.querySelectorAll('.emotional-line-connecting, .emotional-line-pulse').forEach(el => {
                    el.classList.remove('emotional-line-connecting', 'emotional-line-pulse');
                });
            }, 800);
        }
    }

    createEmotionalPath(rel, from, to, isNew = false) {
        const elements = [];
        const style = window.EMOTIONAL_STYLES[rel.subtype] || window.EMOTIONAL_STYLES.default;
        switch (style.builder) {
            case 'straight': this.buildStraightLine(elements, from, to, style, isNew); break;
            case 'double': this.buildDoubleLine(elements, from, to, style, isNew); break;
            case 'triple': this.buildTripleLine(elements, from, to, style, isNew); break;
            case 'zigzag': this.buildZigzagLine(elements, from, to, style, isNew); break;
            case 'wavy': this.buildWavyLine(elements, from, to, style, isNew); break;
            case 'broken': this.buildBrokenLine(elements, from, to, style, isNew); break;
            default: this.buildStraightLine(elements, from, to, style, isNew);
        }
        return elements;
    }

    buildStraightLine(elements, from, to, style, isNew) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', from.x); line.setAttribute('y1', from.y);
        line.setAttribute('x2', to.x); line.setAttribute('y2', to.y);
        const classList = ['emotional-line', `emotional-${style.builder}`];
        if (isNew) classList.push('emotional-line-connecting', 'emotional-line-pulse');
        line.setAttribute('class', classList.join(' '));
        line.style.stroke = style.color;
        line.style.strokeWidth = `${style.width * this.renderer.emotionalStrokeWidth}px`;
        if (style.dash) line.setAttribute('stroke-dasharray', style.dash);
        if (isNew) line.style.setProperty('--pulse-width', style.width * this.renderer.emotionalStrokeWidth);
        elements.push(line);
    }

    buildDoubleLine(elements, from, to, style, isNew) {
        const offset = style.offset || 4;
        const perp = this.getPerpendicularOffset(from, to, offset);
        for (const sign of [-1, 1]) {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', from.x + sign * perp.x); line.setAttribute('y1', from.y + sign * perp.y);
            line.setAttribute('x2', to.x + sign * perp.x); line.setAttribute('y2', to.y + sign * perp.y);
            this.applyLineStyle(line, style, isNew);
            elements.push(line);
        }
    }

    buildTripleLine(elements, from, to, style, isNew) {
        const offset = style.offset || 3;
        const perp = this.getPerpendicularOffset(from, to, offset);
        for (const mult of [0, -1.5, 1.5]) {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', from.x + mult * perp.x); line.setAttribute('y1', from.y + mult * perp.y);
            line.setAttribute('x2', to.x + mult * perp.x); line.setAttribute('y2', to.y + mult * perp.y);
            this.applyLineStyle(line, style, isNew);
            elements.push(line);
        }
    }

    buildZigzagLine(elements, from, to, style, isNew) {
        const dx = to.x - from.x, dy = to.y - from.y;
        const length = Math.hypot(dx, dy);
        const steps = Math.max(6, Math.floor(length / (style.step || 20)));
        let pathData = `M ${from.x} ${from.y}`;
        for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            const x = from.x + dx * t, y = from.y + dy * t;
            const perp = this.getPerpendicularOffset(from, to, (i % 2 === 0 ? 1 : -1) * style.amplitude);
            pathData += ` L ${x + perp.x} ${y + perp.y}`;
        }
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pathData);
        this.applyLineStyle(path, style, isNew);
        elements.push(path);
    }

    buildWavyLine(elements, from, to, style, isNew) {
        const dx = to.x - from.x, dy = to.y - from.y;
        const length = Math.hypot(dx, dy);
        const steps = Math.max(8, Math.floor(length / (style.step || 16)));
        let pathData = `M ${from.x} ${from.y}`;
        for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            const x = from.x + dx * t, y = from.y + dy * t;
            const perp = this.getPerpendicularOffset(from, to, Math.sin(i * Math.PI / 2) * style.amplitude);
            pathData += ` L ${x + perp.x} ${y + perp.y}`;
        }
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pathData);
        this.applyLineStyle(path, style, isNew);
        elements.push(path);
    }

    buildBrokenLine(elements, from, to, style, isNew) {
        const dx = to.x - from.x, dy = to.y - from.y;
        const length = Math.hypot(dx, dy);
        const gap = style.gap || 20;
        const segments = Math.floor(length / (gap * 2));
        let pathData = '';
        for (let i = 0; i < segments; i++) {
            const t1 = (i * 2 * gap) / length, t2 = ((i * 2 + 1) * gap) / length;
            if (t2 > 1) break;
            pathData += `M ${from.x + dx * t1} ${from.y + dy * t1} L ${from.x + dx * t2} ${from.y + dy * t2} `;
        }
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pathData);
        this.applyLineStyle(path, style, isNew);
        elements.push(path);
    }

    applyLineStyle(element, style, isNew) {
        const classList = ['emotional-line'];
        if (isNew) classList.push('emotional-line-connecting', 'emotional-line-pulse');
        element.setAttribute('class', classList.join(' '));
        element.style.stroke = style.color;
        element.style.strokeWidth = `${style.width * this.renderer.emotionalStrokeWidth}px`;
        element.style.fill = 'none';
        element.style.strokeLinecap = 'round';
        element.style.strokeLinejoin = 'round';
        if (style.dash) element.setAttribute('stroke-dasharray', style.dash);
        if (isNew) element.style.setProperty('--pulse-width', style.width * this.renderer.emotionalStrokeWidth);
    }

    getPerpendicularOffset(from, to, amount) {
        const dx = to.x - from.x, dy = to.y - from.y;
        const length = Math.hypot(dx, dy) || 1;
        return { x: -dy / length * amount, y: dx / length * amount };
    }

    renderPreviewLine(from, to, subtype) {
        if (!from || !to || !this.renderer.layerPreview) return;
        this.clearPreviewLine();

        // [FIX EMO-02] from/to가 스크린 좌표인지 SVG 좌표인지 판별 후 변환
        // 휴리스틱: SVG 좌표는 일반적으로 캔버스 내 노드 위치(수백~수천)이고,
        // 스크린 좌표는 뷰포트 기준이므로 panX/panY/zoom으로 역변환한 값과
        // 직접 값이 크게 다를 수 있다. 가장 안전한 방법은 항상 SVG CTM으로 변환.
        // renderPreviewLine 호출자가 스크린 좌표를 전달할 경우를 대비해,
        // SVG 좌표 범위 밖(음수 크거나 viewBox 밖)이면 변환을 시도한다.
        const toSVGCoord = (screenX, screenY) => ({
            x: (screenX - this.renderer.panX) / this.renderer.currentZoom,
            y: (screenY - this.renderer.panY) / this.renderer.currentZoom
        });

        // SVG BBox로 유효 범위 추정: person 노드들의 x/y는 SVG 좌표계에 있으므로
        // from/to 중 하나가 person 객체({ x, y }=SVG좌표)라면 변환 불필요.
        // 단, 마우스 좌표(스크린)가 전달된 경우 변환 적용.
        // → 판단 기준: zoom/pan이 적용된 상태에서 스크린 좌표를 역변환한 값이
        //   from.x / from.y 와 1px 이상 차이나면 스크린 좌표로 간주.
        let svgFrom = from;
        let svgTo = to;

        if (this.renderer.currentZoom !== 1 || this.renderer.panX !== 0 || this.renderer.panY !== 0) {
            const convertedFrom = toSVGCoord(from.x, from.y);
            const convertedTo = toSVGCoord(to.x, to.y);

            // from이 person 객체라면 SVG 좌표 그대로 사용 (person.x는 SVG 좌표)
            // 마우스 이벤트 좌표(clientX 기반)는 보통 스크린 좌표이므로
            // from._isSVGCoord 플래그가 있으면 변환 스킵, 없으면 변환 적용
            if (from._isSVGCoord !== true) {
                svgFrom = convertedFrom;
            }
            if (to._isSVGCoord !== true) {
                svgTo = convertedTo;
            }
        }

        const style = window.EMOTIONAL_STYLES[subtype] || window.EMOTIONAL_STYLES.default;
        const tempRel = { subtype };
        const elements = this.createEmotionalPath(tempRel, svgFrom, svgTo, false);
        elements.forEach(el => {
            el.style.opacity = '0.5';
            el.style.strokeDasharray = '8 4';
            el.style.pointerEvents = 'none';
            this.renderer.layerPreview.appendChild(el);
        });
    }

    clearPreviewLine() {
        if (this.renderer.layerPreview) this.renderer.layerPreview.innerHTML = '';
    }
}

if (typeof window !== 'undefined') {
    window.EmotionalRenderer = EmotionalRenderer;
}
