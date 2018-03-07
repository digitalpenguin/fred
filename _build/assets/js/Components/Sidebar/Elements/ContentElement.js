import drake from '../../../drake';
import imageEditor from '../../../Editors/ImageEditor';

export class ContentElement {
    constructor(el, dzName, parent = null, content = {}, settings = {}) {
        this.el = el;
        this.id = parseInt(this.el.dataset.fredElementId);
        
        this.parent = parent;
        this.dzName = dzName;
        this.content = {...content};
        this.settings = {...settings};
        this.dzs = {};
        
        this.wrapper = this.render();
    }
    
    getContent() {
        const content = {
            widget: this.id,
            values: this.content,
            settings: this.settings,
            children: {}
        };
        
        for (let dzName in this.dzs) {
            if (this.dzs.hasOwnProperty(dzName)) {
                if (this.dzs[dzName].children.length > 0) {
                    content.children[dzName] = [];

                    this.dzs[dzName].children.forEach(child => {
                        content.children[dzName].push(child.fredEl.getContent());    
                    });
                }
            }
        }
        
        return content;
    }
    
    render() {
        const wrapper = document.createElement('div');
        wrapper.classList.add('fred--block');
        wrapper.fredEl = this;

        const toolbar = document.createElement('div');
        toolbar.classList.add('fred--toolbar');

        const moveHandle = document.createElement('button');
        moveHandle.classList.add('fred--move-icon', 'handle');

        const duplicate = document.createElement('button');
        duplicate.classList.add('fred--duplicate-icon');
        duplicate.addEventListener('click', e => {
            e.preventDefault();
            this.duplicate();
        });

        const trashHandle = document.createElement('button');
        trashHandle.classList.add('fred--trash');
        trashHandle.addEventListener('click', e => {
            e.preventDefault();
            this.remove();
        });

        toolbar.appendChild(moveHandle);

        toolbar.appendChild(duplicate);
        toolbar.appendChild(trashHandle);

        wrapper.appendChild(toolbar);

        const content = document.createElement('div');
        content.classList.add('fred--block_content');
        content.dataset.fredElementId = this.el.dataset.fredElementId;

        content.innerHTML = this.el.innerHTML;
        
        const dzs = content.querySelectorAll('[data-fred-dropzone]');
        
        let prev = null;
        
        for (let dz of dzs) {
            if (prev === null) {
                prev = dz;
                dz.fredEl = this;
                if (!this.dzs[dz.dataset.fredDropzone]) {
                    this.dzs[dz.dataset.fredDropzone] = {
                        el: dz, 
                        children: []
                    };
                } else {
                    this.dzs[dz.dataset.fredDropzone].el = dz;
                    this.dzs[dz.dataset.fredDropzone].children.forEach(child => {
                        this.dzs[dz.dataset.fredDropzone].el.appendChild(child);
                    });
                }
            } else {
                if (!prev.contains(dz)) {
                    dz.fredEl = this;
                    prev = dz;
                    if (!this.dzs[dz.dataset.fredDropzone]) {
                        this.dzs[dz.dataset.fredDropzone] = {
                            el: dz,
                            children: []
                        };
                    } else {
                        this.dzs[dz.dataset.fredDropzone].el = dz;
                        this.dzs[dz.dataset.fredDropzone].children.forEach(child => {
                            this.dzs[dz.dataset.fredDropzone].el.appendChild(child);
                        });
                    }
                }
            }
        }
        
        for (let setting in this.settings) {
            if (this.settings.hasOwnProperty(setting)) {
                content.innerHTML = content.innerHTML.replace(new RegExp('{{' + setting + '}}', 'g'), this.settings[setting]);
            }
        }
        
        content.querySelectorAll('[contenteditable="true"]').forEach(el => {
            const observer = new MutationObserver(mutations => {
                mutations.forEach(mutation => {
                    if (mutation.type === 'characterData') {
                        this.content[el.dataset.fredName] = el.innerHTML;
                        return;
                    }

                    if (mutation.type === 'attributes') {
                        if (mutation.attributeName === 'src') {
                            this.content[el.dataset.fredName] = el.getAttribute(mutation.attributeName);
                            return;
                        }
                    }
                });
            });
            
            observer.observe(el, {
                attributes: true,
                characterData: true,
                subtree: true
            });
            
            if (this.content[el.dataset.fredName]) {
                switch(el.nodeName.toLowerCase()) {
                    case 'img':
                        el.setAttribute('src', this.content[el.dataset.fredName]);
                        break;
                    default:
                       el.innerHTML = this.content[el.dataset.fredName];
                }
            }
        });
        
        content.querySelectorAll('img[contenteditable="true"]').forEach(img => {
            img.addEventListener('click', e => {
                e.preventDefault();
                imageEditor.edit(img);
            })
        });

        wrapper.appendChild(content);
        
        return wrapper;
    }
    
    reRender() {
        const newWrapper = this.render();

        this.wrapper.replaceWith(newWrapper);
        this.wrapper = newWrapper;
    }
    
    remove() {
        if (this.parent) {
            const index = this.parent.dzs[this.dzName].children.indexOf(this.wrapper);
            if (index > -1) {
                this.parent.dzs[this.dzName].children.splice(index, 1);
            }
        }

        this.wrapper.remove();
    }

    duplicateDropZones(dzs) {
        for (let dzName in dzs) {
            if (dzs.hasOwnProperty(dzName)) {
                dzs[dzName].children.forEach(child => {
                    if (this.dzs[dzName]) {
                        const clonedChild = new ContentElement(child.fredEl.el, dzName, this, child.fredEl.content, child.fredEl.settings);
                        this.addElementToDropZone(dzName, clonedChild);

                        clonedChild.duplicateDropZones(child.fredEl.dzs);
                    }
                });
            }
        }
    }
    
    duplicate() {
        const clone = new ContentElement(this.el, this.dzName, this.parent, this.content, this.settings);
        clone.duplicateDropZones(this.dzs);
        
        if (this.wrapper.nextSibling === null) {
            this.wrapper.parentNode.appendChild(clone.wrapper);
        } else {
            this.wrapper.parentNode.insertBefore(clone.wrapper, this.wrapper.nextSibling);
        }

        if (this.parent) {
            const index = this.parent.dzs[this.dzName].children.indexOf(this.wrapper);
            if (index > -1) {
                this.parent.dzs[this.dzName].children.splice(index + 1, 0, clone.wrapper);
            }
        }

        drake.reloadContainers();
        
        return true;
    }

    addElementToDropZone(zoneName, element) {
        if (!this.dzs[zoneName]) return false;
        
        this.dzs[zoneName].children.push(element.wrapper);
        this.dzs[zoneName].el.appendChild(element.wrapper);
        
        return true;
    }
}

export default ContentElement;