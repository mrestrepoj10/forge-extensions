
import { BaseExtension } from "./BaseExtension.js";


class IsolateExtension extends BaseExtension {
    constructor(viewer, options) {
        super(viewer, options);
        this._button = null;
    }

    async load() {
        super.load();
        console.log('IsolateExtension loaded');
        return true;
    }

    unload() {
        super.unload();
        this.viewer.clearThemingColors(); // Clear any theming colors
        this.viewer.showAll(); // Show all elements
        if (this._button) {
            this.removeToolbarButton(this._button);
            this._button = null;
        }
        console.log('IsolateExtension unloaded');
        return true;
    }
    

    onToolbarCreated() {
    this._button = this.createToolbarButton('isolate-button','https://www.shareicon.net/data/512x512/2015/12/08/684418_hide_512x512.png', 'Hide unselected');
    this._button.onClick = () => {
        this.isolateSelected();
    };

    // // Add the button to the toolbar
    // this.viewer.toolbar.addControl(this._button);
    }


    onModelLoaded(model) {
        super.onModelLoaded(model);
    }

    static async getLeafNodes(model, dbIds) {
        return new Promise((resolve, reject) => {
            try {
                const instanceTree = model.getData().instanceTree;
                dbIds = dbIds || instanceTree.getRootId();
                const dbIdArray = Array.isArray(dbIds) ? dbIds : [dbIds];
                let leafIds = [];

                const getLeafNodesRec = (id) => {
                    var childCount = 0;
                    instanceTree.enumNodeChildren(id, (childId) => {
                        getLeafNodesRec(childId);
                        ++childCount;
                    });
                    if (childCount === 0) {
                        leafIds.push(id);
                    }
                };

                dbIdArray.forEach((dbId) => getLeafNodesRec(dbId));
                resolve(leafIds);
            } catch (ex) {
                reject(ex);
            }
        });
    }

    static async isolateFull(viewer, model = null, dbIds = []) {
        return new Promise(async (resolve, reject) => {
            try {
                model = model || viewer.model;
                viewer.isolate(dbIds);
                const targetIds = Array.isArray(dbIds) ? dbIds : [dbIds];
                const targetLeafIds = await IsolateExtension.getLeafNodes(model, targetIds);
                const leafIds = await IsolateExtension.getLeafNodes(model);
    
                const leafTasks = leafIds.map((dbId) => {
                    return new Promise((resolveLeaf) => {
                        const show = targetLeafIds.includes(dbId);
                        viewer.impl.visibilityManager.setNodeOff(dbId, !show);
                        resolveLeaf();
                    });
                });
    
                await Promise.all(leafTasks);
                resolve();
            } catch (ex) {
                reject(ex);
            }
        });
    }

    async isolateSelected() {
        const selected = this.viewer.getSelection();
        if (selected.length > 0) {
            await IsolateExtension.isolateFull(this.viewer, null, selected);
        } else {
            // Reset visibility for all nodes before showing all
            const allIds = this.getAllObjectIds();
            allIds.forEach((id) => {
                this.viewer.impl.visibilityManager.setNodeOff(id, false);
            });
    
            // Show all elements
            this.viewer.isolate([]); // Reset isolation
            this.viewer.showAll(); // Show all elements
            // this.viewer.clearThemingColors(); // Clear any theming colors if used
        }
    }

    resetViewer() {
        const allIds = this.getAllObjectIds();
        this.viewer.show(allIds); // Show all elements
        this.viewer.clearThemingColors(); // Clear any theming colors
        this.viewer.isolate([]); // Reset isolation
    }

    getAllObjectIds() {
        const instanceTree = this.viewer.model.getData().instanceTree;
        const allIds = [];
        instanceTree.enumNodeChildren(instanceTree.getRootId(), (dbId) => {
            allIds.push(dbId);
        }, true);
        return allIds;
    }
    

}


Autodesk.Viewing.theExtensionManager.registerExtension('IsolateExtension', IsolateExtension);