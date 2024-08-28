import { BaseExtension } from "./BaseExtension.js";


class ColorsExtension extends BaseExtension {
    constructor(viewer, options) {
        super(viewer, options);
        this._button = null;
        this._customColorsApplied = false; 
    }

    async load() {
        super.load();
        console.log('ColorsExtension');
        return true;
    }

    unload() {
        super.unload();
        if(this._button) {
            this.removeToolbarButton(this._button);
            this._button = null;
        }
        console.log('ColorsExtension unloaded');
        return true;
    }

    onToolbarCreated() {
        this._button = this.createToolbarButton('colors-button', 'https://img.icons8.com/small/32/brief.png', 'Custom Colors');
        this._button.onClick = () => {
            this.toggleColors();
        };
    }

    toggleColors() {
        if (this._customColorsApplied) {
            this.applyDefaultColors();
        } else {
            this.applyCustomColors();
        }
        this._customColorsApplied = !this._customColorsApplied;
    }

    applyCustomColors() {
        // Example dbIds and colors
        const elementsToColor = [
            { dbId: 13337, color: new THREE.Vector4(1, 0, 0, 1) }, // Red
            { dbId: 15092, color: new THREE.Vector4(0, 1, 0, 1) }, // Green
            { dbId: 2385, color: new THREE.Vector4(0, 0, 1, 1) }  // Blue
        ];
    
        elementsToColor.forEach(elem => {
            this.viewer.setThemingColor(elem.dbId, elem.color);
        });
    }

    applyDefaultColors() {
        this.viewer.clearThemingColors();
    }

    onModelLoaded(model) {
        super.onModelLoaded(model);
    }
}


Autodesk.Viewing.theExtensionManager.registerExtension('ColorsExtension', ColorsExtension);