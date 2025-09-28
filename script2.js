document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('myCanvas');
    const ctx = canvas.getContext('2d');
    const container = document.getElementById('canvas-container');

    let width, height, centerX, centerY;
    
    // Factor for smooth easing movement toward the target angle
    const EASING_FACTOR = 0.15; 
    // Angle to align the first segment to 12 o'clock when the rotation is $0$.
    const INITIAL_SEGMENT_ALIGNMENT = -Math.PI / 2; 

    // --- DRAG LOGIC STATE & IDS ---
    let isDragging = false;
    let draggedCircle = null;
    let lastMouseAngle = 0;
    // Rings $2$ through $7$ are fully draggable.
    const DRAGGABLE_CIRCLE_IDS = [2, 3, 4, 5, 6,]; 
    // ------------------------------------

    // Define solid colors based on the visual wheel structure and user's requested order
    const COLORS = [
        '#0B3A60', // 1: Dark Navy (Center) - Learner (Static)
        '#FF9800', // 2: Orange - Prior Learning / Interests
        '#4CAF50', // 3: Green - Attitudes / Knowledge / Skills / Understanding
        '#2196F3', // 4: Blue - Numeracy / Personal / Working Life / Healthy Living / Literacy
        '#9C27B0', // 5: Purple - The Arts / Languages / etc.
        '#E91E63', // 6: Pink - Junior / Leaving Cert
        '#4B0082', // 7: Red - Collaboration / Flexibility
    ];

    // Define circle data: radius (innermost to outermost)
    const circlesData = [
        // Circle 1: Static Center (40 * 1.2 = 48)
        { id: 1, radius: 48, color: COLORS[0], isStatic: true, rotation: 0, targetRotation: 0, offset: 0, label: "Learner", textColor: 'white', labelSize: '16px' }, 
        
        // Circle 2: Orange - 4 segments (80 * 1.2 = 96)
        { id: 2, radius: 96, color: COLORS[1], isStatic: false, rotation: 0, targetRotation: 0, offset: 0, label: null, segments: [["Learning", "Prior"], "Interests", ["Care Plan", "IEP"], ["Aspirations", "Future"]], textColor: 'white', labelSize: '14px' }, // "Prior Learning" is now a nested array
        
        // Circle 3: Green - 4 segments (120 * 1.2 = 144)
        { id: 3, radius: 144, color: COLORS[2], isStatic: false, rotation: 0, targetRotation: 0, offset: 0, label: null, segments: ["Attitudes", "Knowledge", "Skills", "Understanding"], textColor: 'white', labelSize: '14px' }, 
        
        // Circle 4: Blue - 5 segments (160 * 1.2 = 192)
        { id: 4, radius: 192, color: COLORS[3], isStatic: false, rotation: 0, targetRotation: 0, offset: 0, label: null, segments: ["Numeracy", "Personal", "Working Life", "Healthy Living", "Literacy"], textColor: 'white', labelSize: '14px' }, 

        // Circle 5: Purple - 10 segments (200 * 1.2 = 240)
        { id: 5, radius: 240, color: COLORS[4], isStatic: false, rotation: 0, targetRotation: 0, offset: 0, label: null, 
          segments: ["The Arts", "Languages", "Soc. & Env.", "Moral/Religious", "Guidance", "English", "Science", "Design & Tech", "Health & PE", "Maths"], 
          textColor: 'white', labelSize: '14px' }, 

        // Circle 6: Pink - 7 segments (240 * 1.2 = 288)
        { id: 6, radius: 288, color: COLORS[5], isStatic: false, rotation: 0, targetRotation: 0, offset: 0, label: null, segments: ["FETAC", "JCSP", "Leaving Cert", "ICT/EAL", "In-house Certification", "Primary Curriculum", "Junior Cert"], textColor: 'white', labelSize: '14px' }, 

        // Circle 7: Red - 7 segments (280 * 1.2 = 336)
        // Fixed rotation: +PI/2 (approx +90 degrees) to shift 'Diversity' to the desired 1 o'clock position.
        { id: 7, radius: 336, color: COLORS[6], isStatic: false, rotation: Math.PI / 2, targetRotation: Math.PI / 2, offset: 0, label: null, segments: ["Diversity", "Collaboration/Partnership", "Progression", "Equality", "Continuity", "Flexibility", "Personalised Learning"], textColor: 'white', labelSize: '14px' }, 
    ];

    /**
     * Initializes the canvas dimensions and center point, handling responsiveness.
     */
    const initializeCanvas = () => {
        width = container.clientWidth;
        height = container.clientHeight;
        
        // Use the smaller dimension for max size to ensure fitting
        const size = Math.min(width, height) * 0.9; 
        canvas.width = size;
        canvas.height = size;

        centerX = canvas.width / 2;
        centerY = canvas.height / 2;
    }

    /**
     * Draws all circles from outermost ($7$) to innermost ($1$) to create the band effect.
     */
    const drawCircles = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Iterate from OUTSIDE ($7$) to INSIDE ($1$)
        for (let i = circlesData.length - 1; i >= 0; i--) {
            const circle = circlesData[i];
            
            ctx.save(); // Save the state before transformation

            // 1. Move the origin to the center of the canvas
            ctx.translate(centerX, centerY);

            // 2. Apply rotation based on the current angle
            ctx.rotate(circle.rotation);

            // Start drawing the full circle
            ctx.beginPath();
            ctx.arc(0, 0, circle.radius, 0, Math.PI * 2);

            // Fill the area.
            ctx.fillStyle = circle.color;
            ctx.fill();

            // --- DRAW TEXT LOGIC ---
            
            if (circle.id === 1 && circle.label) {
                // Center text for the 'Learner' circle (ID 1)
                ctx.fillStyle = circle.textColor; 
                ctx.font = `700 ${circle.labelSize} Inter`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.rotate(-circle.rotation); // Counter-rotate to keep text upright
                ctx.fillText(circle.label, 0, 0);
                
            } else if (circle.segments) { 
                // Curved text segments logic for rings $2$ through $7$

                // Determine the radius where the text should sit (midpoint of the ring band)
                let radiusForText;
                if (circle.id === 2) radiusForText = 72;    // 60 * 1.2
                else if (circle.id === 3) radiusForText = 120;  // 100 * 1.2
                else if (circle.id === 4) radiusForText = 168;  // 140 * 1.2
                else if (circle.id === 5) radiusForText = 216;  // 180 * 1.2
                else if (circle.id === 6) radiusForText = 264;  // 220 * 1.2
                else if (circle.id === 7) radiusForText = 312;  // 260 * 1.2 
                
                const segmentCount = circle.segments.length;
                const segmentArc = (Math.PI * 2) / segmentCount; 
                const segmentTextSize = parseInt(circle.labelSize.replace('px', ''), 10);
                // Offset for stacked lines (e.g., 12px up and 12px down from the center radius)
                const lineOffset = segmentTextSize * 0.7; 

                // Set text styles
                ctx.fillStyle = circle.textColor;
                ctx.font = `600 ${circle.labelSize} Inter`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                // Adjustment to center the first segment at 12 o'clock (top of the circle)
                const initialSegmentRotation = INITIAL_SEGMENT_ALIGNMENT; 

                circle.segments.forEach((segmentContent, index) => {
                    
                    // Determine lines and their radii: check if segment content is an array
                    const lines = Array.isArray(segmentContent) ? segmentContent : [segmentContent];
                    
                    // Calculate radii for stacked text
                    const radii = lines.map((_, lineIndex) => {
                        if (lines.length === 1) return radiusForText;
                        
                        // For two lines, push one line inwards and one outwards from the center radius
                        return radiusForText + (lineIndex === 0 ? -lineOffset : lineOffset);
                    });


                    lines.forEach((text, lineIndex) => {
                        const currentRadiusForText = radii[lineIndex];

                        ctx.save();
                        
                        // 1. Calculate the rotation for the segment's starting point
                        let startSegmentRotation = initialSegmentRotation + (index * segmentArc);
                        
                        // Apply this rotation to the context
                        ctx.rotate(startSegmentRotation);

                        // 2. Calculate the text's angular width for centering in the segment arc
                        const textAngleLength = ctx.measureText(text).width / currentRadiusForText;
                        
                        // Rotate to the point where the first character should begin
                        ctx.rotate((segmentArc / 2) - (textAngleLength / 2)); 

                        // 3. Draw characters along the arc
                        for (let j = 0; j < text.length; j++) {
                            const char = text[j];
                            const charWidth = ctx.measureText(char).width;
                            
                            // Angle needed for this character
                            const charAngle = charWidth / currentRadiusForText;
                            
                            // Rotate context by half the character's required angle
                            ctx.rotate(charAngle / 2); 
                            
                            // Draw the character at the required radius (Y is negative to draw outward from the center)
                            ctx.fillText(char, 0, -currentRadiusForText); 
                            
                            // Rotate context by the other half of the character's required angle
                            ctx.rotate(charAngle / 2);
                        }
                        
                        ctx.restore();
                    }); // End lines.forEach

                }); // End circle.segments.forEach

            } 

            ctx.restore(); // Restore the previous canvas state
        }
    }

    /**
     * Updates the state of each circle (smoothly moves rotation toward target).
     */
    const updateCircles = () => {
        
        circlesData.forEach(circle => {
            
            if (circle.isStatic) {
                circle.rotation = 0; 
            } else if (DRAGGABLE_CIRCLE_IDS.includes(circle.id) && isDragging) {
                // Skip easing if currently dragging
                return;
            } else {
                // Smoothly ease the current rotation toward the target rotation
                const delta = circle.targetRotation - circle.rotation;
                // Stop rotation if the distance is very small (to prevent jitter)
                if (Math.abs(delta) < 0.001) {
                    circle.rotation = circle.targetRotation;
                } else {
                    circle.rotation += delta * EASING_FACTOR; 
                }
            }
        });
    }

    /**
     * Main animation loop using requestAnimationFrame.
     */
    const animate = () => {
        updateCircles();
        drawCircles();
        requestAnimationFrame(animate);
    }

    /**
     * Helper to get mouse or touch position relative to canvas
     */
    const getMousePos = (event, rect) => {
        if (event.touches) {
            return {
                x: event.touches[0].clientX - rect.left,
                y: event.touches[0].clientY - rect.top
            };
        }
        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        };
    }

    // ------------------------------------
    // --- DRAG HANDLERS for Rings $2$ through $7$ ---
    // ------------------------------------

    const handleStartDrag = (mouseX, mouseY) => {
        const dist = Math.sqrt((mouseX - centerX) ** 2 + (mouseY - centerY) ** 2);
        
        // Find the ring that was clicked
        let clickedRing = null;
        
        for (let i = circlesData.length - 1; i >= 0; i--) {
            const circle = circlesData[i];
            const outerRadius = circle.radius;
            const innerRadius = (i > 0) ? circlesData[i - 1].radius : 0;

            if (dist <= outerRadius && dist > innerRadius) {
                clickedRing = circle;
                break;
            }
        }

        // Check if the clicked ring is one of the designated draggable IDs
        if (clickedRing && DRAGGABLE_CIRCLE_IDS.includes(clickedRing.id) && !clickedRing.isStatic) {
            draggedCircle = clickedRing;
            isDragging = true;
            
            // Calculate initial angle of click point relative to the center
            lastMouseAngle = Math.atan2(mouseY - centerY, mouseX - centerX);
            canvas.style.cursor = 'grabbing';
        }
    }

    const handleDrag = (mouseX, mouseY) => {
        if (!isDragging || !draggedCircle) return;

        const currentMouseAngle = Math.atan2(mouseY - centerY, mouseX - centerX);
        let angleDelta = currentMouseAngle - lastMouseAngle;

        // Handle wrap-around
        if (angleDelta > Math.PI) angleDelta -= 2 * Math.PI;
        if (angleDelta < -Math.PI) angleDelta += 2 * Math.PI;

        // Update the circle's rotation and target rotation instantly during drag
        draggedCircle.rotation += angleDelta;
        draggedCircle.targetRotation = draggedCircle.rotation; // Keep target synced for stabilization

        lastMouseAngle = currentMouseAngle;
    }

    const handleEndDrag = () => {
        if (!isDragging || !draggedCircle) return;

        // Stop dragging state
        isDragging = false;
        canvas.style.cursor = 'grab';

        // Set the target rotation to the current rotation (no snapping)
        draggedCircle.targetRotation = draggedCircle.rotation; 
        
        draggedCircle = null;
    }

    // --- Event Listeners and Initial Setup ---

    // Handle window resize for responsiveness
    window.addEventListener('resize', () => {
        initializeCanvas();
        drawCircles(); // Redraw immediately after resize
    });
    
    // Mouse Listeners
    canvas.addEventListener('mousedown', (event) => {
        const rect = canvas.getBoundingClientRect();
        const mousePos = getMousePos(event, rect);
        handleStartDrag(mousePos.x, mousePos.y);
    });

    canvas.addEventListener('mousemove', (event) => {
        const rect = canvas.getBoundingClientRect();
        const mousePos = getMousePos(event, rect);
        handleDrag(mousePos.x, mousePos.y);
    });

    // Use `document` for mouseup to ensure release even if the cursor moves off the canvas
    document.addEventListener('mouseup', handleEndDrag);

    // Touch Listeners
    canvas.addEventListener('touchstart', (event) => {
        event.preventDefault(); // Prevent scrolling/zooming
        const rect = canvas.getBoundingClientRect();
        const touchPos = getMousePos(event, rect);
        handleStartDrag(touchPos.x, touchPos.y);
    }, { passive: false });

    canvas.addEventListener('touchmove', (event) => {
        event.preventDefault(); 
        const rect = canvas.getBoundingClientRect();
        const touchPos = getMousePos(event, rect);
        handleDrag(touchPos.x, touchPos.y);
    }, { passive: false });

    canvas.addEventListener('touchend', handleEndDrag);


    // Start the application
    initializeCanvas();
    animate();
});
