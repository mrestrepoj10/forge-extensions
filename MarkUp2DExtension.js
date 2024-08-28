import { BaseExtension } from "./BaseExtension.js";

class MarkupsExtension extends BaseExtension {
    constructor(viewer, options) {
        super(viewer, options);
        this._button = null;
        this._markupsCore = null;
        this._drawingToolbar = null;
        this._markupIdCounter = 0; // Counter to generate unique IDs for markups
        this._savedMarkups = []; // Array to store saved markups
        this._viewerState = null; // Variable to store the viewer state
        this._markupSelectDropdown = null; // Dropdown for selecting saved markups
        this._isInEditMode = false; // Flag to track if we're in edit mode
    }

    async load() {
        await super.load();
        console.log('MarkupsExtension loaded');

        // Load the MarkupsCore extension
        this._markupsCore = await this.viewer.loadExtension('Autodesk.Viewing.MarkupsCore');
        
        if (this._markupsCore) {
            console.log('MarkupsCore loaded');
        } else {
            console.error('Failed to load MarkupsCore');
            return false;
        }

        return true;
    }

    unload() {
        super.unload();
        if (this._button) {
            this.removeToolbarButton(this._button);
            this._button = null;
        }
        if (this._markupsCore) {
            this.viewer.unloadExtension('Autodesk.Viewing.MarkupsCore');
            this._markupsCore = null;
        }
        if (this._drawingToolbar) {
            this.viewer.toolbar.removeControl(this._drawingToolbar);
            this._drawingToolbar = null;
        }
        console.log('MarkupsExtension unloaded');
        return true;
    }

    onToolbarCreated() {
        console.log('Creating Markups button in main toolbar');

        // Main button to enter markup mode
        this._button = this.createToolbarButton('markups-button', 'https://img.icons8.com/small/32/markup.png', 'Custom Markups');
        this._button.onClick = () => {
            this.toggleMarkupMode();
        };

        // Create the drawing toolbar after the main toolbar is ready
        this.createDrawingToolbar();

        // Add a dropdown in the main toolbar to view saved markups
        const markupViewGroup = new Autodesk.Viewing.UI.ControlGroup('markupViewGroup');
        
        this._markupSelectDropdown = document.createElement('select');
        this._markupSelectDropdown.style.margin = '0 5px';
        this._markupSelectDropdown.addEventListener('change', (event) => {
            const selectedId = parseInt(event.target.value, 10);
            console.log(`Dropdown changed. Selected ID: ${selectedId}`);
            if (selectedId || selectedId === 0) {  // Modified to handle 0 as a valid ID
                this.restoreMarkups(selectedId);
            }
        });
        
        // Wrap the dropdown in a control for the Autodesk UI
        const dropdownControl = new Autodesk.Viewing.UI.Control('markupSelectDropdown');
        dropdownControl.addClass('markup-select-dropdown');
        dropdownControl.container.appendChild(this._markupSelectDropdown);
        markupViewGroup.addControl(dropdownControl);

        // Add the view group to the main toolbar
        this.viewer.toolbar.addControl(markupViewGroup);

        console.log('Markup view dropdown added to the main toolbar.');
    }

    toggleMarkupMode() {
        if (this._markupsCore) {
            if (this._isInEditMode) {
                console.log('Leaving Markup mode');
                this.saveMarkups();
                this._markupsCore.leaveEditMode(); // Deactivate Markup mode
                this._drawingToolbar.setVisible(false); // Hide drawing toolbar
                this._isInEditMode = false;
                this.updateMarkupDropdown(); // Update the dropdown with the new markup list
            } else {
                console.log('Entering Markup mode');
                this._viewerState = this.viewer.getState(); // Save current viewer state
                this._markupsCore.enterEditMode(); // Activate Markup mode
                
                console.log('Showing drawing toolbar');
                this._drawingToolbar.setVisible(true); // Show drawing toolbar
                this._drawingToolbar.container.style.display = 'block'; // Ensure it's visible
                this._isInEditMode = true;
                
                console.log('Toolbar visibility:', this._drawingToolbar.isVisible());
            }
        }
    }

    createDrawingToolbar() {
        // Ensure that the viewer's toolbar is available
        if (!this.viewer.toolbar) {
            console.error('Viewer toolbar not found.');
            return;
        }

        console.log('Creating drawing toolbar');

        // Create a new toolbar for drawing tools
        this._drawingToolbar = new Autodesk.Viewing.UI.ToolBar('drawingToolbar');

        // Add Autodesk's standard classes to match the look and feel
        this._drawingToolbar.container.classList.add('adsk-toolbar', 'adsk-control-group');

        // Ensure no background, border, or shadow is visible
        this._drawingToolbar.container.style.backgroundColor = 'transparent';
        this._drawingToolbar.container.style.border = 'none';
        this._drawingToolbar.container.style.boxShadow = 'none'; // Remove any shadow

        // Create a ControlGroup for the drawing tools
        const drawingTools = new Autodesk.Viewing.UI.ControlGroup('drawingTools');
        drawingTools.container.classList.add('adsk-control-group'); // Standard Autodesk control group class

        // Add buttons for different drawing tools
        const tools = [
            { id: 'arrow-tool', label: 'Arrow', mode: () => new Autodesk.Viewing.Extensions.Markups.Core.EditModeArrow(this._markupsCore) },
            { id: 'rect-tool', label: 'Rectangle', mode: () => new Autodesk.Viewing.Extensions.Markups.Core.EditModeRectangle(this._markupsCore) },
            { id: 'circle-tool', label: 'Circle', mode: () => new Autodesk.Viewing.Extensions.Markups.Core.EditModeCircle(this._markupsCore) },
            { id: 'cloud-tool', label: 'Cloud', mode: () => new Autodesk.Viewing.Extensions.Markups.Core.EditModeCloud(this._markupsCore) },
            { id: 'text-tool', label: 'Text', mode: () => new Autodesk.Viewing.Extensions.Markups.Core.EditModeText(this._markupsCore) },
        ];

        tools.forEach(tool => {
            const button = new Autodesk.Viewing.UI.Button(tool.id);
            button.setToolTip(tool.label);
            button.onClick = () => {
                console.log(`Switching to ${tool.label} mode`);
                const modeInstance = tool.mode();
                this._markupsCore.changeEditMode(modeInstance);
            };
            drawingTools.addControl(button);
        });

        // Add a button to save and exit markup mode
        const saveButton = new Autodesk.Viewing.UI.Button('save-exit-button');
        saveButton.setToolTip('Save and Exit Markup Mode');
        saveButton.onClick = () => {
            this.saveMarkups();
            this._markupsCore.leaveEditMode(); // Exit edit mode
            this._drawingToolbar.setVisible(false); // Hide drawing toolbar
            this._isInEditMode = false;
            this.viewer.restoreState(this._viewerState); // Restore original viewer state
            this.updateMarkupDropdown(); // Update dropdown after saving
        };
        drawingTools.addControl(saveButton);

        // Add the ControlGroup to the toolbar
        this._drawingToolbar.addControl(drawingTools);

        // Add the toolbar to the viewer
        const viewerToolbar = document.getElementById('guiviewer3d-toolbar');
        if (viewerToolbar) {
            viewerToolbar.appendChild(this._drawingToolbar.container);
        } else {
            console.error('Viewer toolbar container not found.');
        }

        // Initially hide the drawing toolbar
        this._drawingToolbar.setVisible(false);

        console.log('Drawing toolbar created and added to the viewer');
    }

    saveMarkups() {
        const markupData = this._markupsCore.generateData(); // Get markup SVG data
        const markupId = this._markupIdCounter++; // Generate unique ID for markup
        this._savedMarkups.push({ id: markupId, data: markupData, viewerState: this._viewerState });
        console.log('Markups saved:', this._savedMarkups);
        this._markupsCore.hide(); // Hide markups after saving
    }

    updateMarkupDropdown() {
        // Clear the existing dropdown options
        this._markupSelectDropdown.innerHTML = '';
        
        // Add a default option
        const defaultOption = document.createElement('option');
        defaultOption.text = 'Select a markup';
        defaultOption.value = '';
        this._markupSelectDropdown.add(defaultOption);

        // Populate the dropdown with saved markups
        this._savedMarkups.forEach(markup => {
            const option = document.createElement('option');
            option.text = `Markup ${markup.id}`;
            option.value = markup.id;
            this._markupSelectDropdown.add(option);
        });

        console.log('Markup dropdown updated.');
    }

    // Method to restore saved markups and viewer state
    restoreMarkups(markupId) {
        console.log(`Attempting to restore markup with ID: ${markupId}`);
        
        const markup = this._savedMarkups.find(m => m.id === markupId);
        if (markup) {
            console.log(`Restoring Markup ${markupId}`);
            
            // Restore the viewer state to the state when the markup was saved
            this.viewer.restoreState(markup.viewerState); 

            // Ensure the markup core is not in edit mode
            if (this._isInEditMode) {
                console.error('Cannot load markups while in edit mode.');
                return;
            }

            // Ensure the markup core is visible
            this._markupsCore.show();

            // Lock the viewer's navigation controls
            this.viewer.setNavigationLock(true); // Disables navigation controls

            // Attempt to load the markups into the viewer
            const success = this._markupsCore.loadMarkups(markup.data, "layer1");

            if (success) {
                console.log(`Markup ${markupId} restored successfully.`);
            } else {
                console.error(`Failed to restore markup ${markupId}.`);
            }
        } else {
            console.error('No markup found with ID:', markupId);
        }
    }
}

// Register the extension with Autodesk Viewer
Autodesk.Viewing.theExtensionManager.registerExtension('MarkupsExtension', MarkupsExtension);





















