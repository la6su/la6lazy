import { Mesh, BoxGeometry, MeshBasicMaterial, AmbientLight } from 'three';
import { BaseLayer } from 'ore-three';

export class HeroLayer extends BaseLayer {
  constructor(param) {
    super(param);
    this.name = param.name || 'HeroLayer';
    this.canvas = param.canvas;
  }

  onBind() {
    this.camera.position.set(0, 0, 4);
    this.camera.aspect = this.info.size.canvasAspectRatio;
    this.camera.updateProjectionMatrix();
    this.camera.lookAt(0, 0, 0);

    const aLight = new AmbientLight(0xffffff, 1.0);
    this.scene.add(aLight);

    this.box = new Mesh(
      new BoxGeometry(),
      new MeshBasicMaterial({ color: 0x00ff00 })
    );

    this.scene.add(this.box);

    this.readyAnimate = true;
    // Trigger initial resize
    this.onResize();
  }

  animate(deltaTime) {
    if (this.box) {
      this.box.rotation.y += deltaTime;
    }

    if (this.renderer) {
      this.renderer.render(this.scene, this.camera);
    }
  }
}
