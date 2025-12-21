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
}
