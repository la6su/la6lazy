import { Mesh, BoxGeometry, MeshBasicMaterial, AmbientLight } from 'three';
import { BaseLayer } from 'ore-three';
import { AssetManager } from '../utils/asset-manager';

interface HeroLayerParam {
  name: string;
  canvas: HTMLCanvasElement;
}

export class HeroLayer extends BaseLayer {
  box?: Mesh;
  readyAnimate: boolean = false;
  private assetManager: AssetManager;

  constructor(param: HeroLayerParam) {
    super({
      name: param.name || 'HeroLayer',
      canvas: param.canvas,
    });

    this.assetManager = AssetManager.getInstance();
  }

  async onBind() {
    this.camera.position.set(0, 0, 4);
    this.camera.aspect = this.info.size.canvasAspectRatio;
    this.camera.updateProjectionMatrix();
    this.camera.lookAt(0, 0, 0);

    const aLight = new AmbientLight(0xffffff, 1.0);
    this.scene.add(aLight);

    // Create simple geometry for now - can be extended to load real assets later
    this.box = new Mesh(
      new BoxGeometry(),
      new MeshBasicMaterial({ color: 0x00ff00 })
    );

    this.scene.add(this.box);

    this.readyAnimate = true;
    // Trigger initial resize
    this.onResize();
  }

  animate(deltaTime: number) {
    if (this.box) {
      this.box.rotation.y += deltaTime;
    }

    if (this.renderer) {
      this.renderer.render(this.scene, this.camera);
    }
  }
  //
  // onResize() {
  //   if (this.camera) {
  //     this.camera.aspect = this.info.size.canvasAspectRatio;
  //     this.camera.updateProjectionMatrix();
  //   }
  // }
  //
  // dispose() {
  //   // Clean up geometry and materials
  //   if (this.box) {
  //     this.box.geometry.dispose();
  //     if (Array.isArray(this.box.material)) {
  //       this.box.material.forEach(material => material.dispose());
  //     } else {
  //       this.box.material.dispose();
  //     }
  //     this.scene.remove(this.box);
  //   }
  //
  //   // Clean up lights
  //   this.scene.children.forEach(child => {
  //     if (child.type === 'AmbientLight') {
  //       this.scene.remove(child);
  //     }
  //   });
  //
  //   // Clear asset manager references if needed
  //   // this.assetManager.clearAssets(); // Uncomment if assets are cached per scene
  // }
}
