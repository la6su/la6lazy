import {
  Mesh,
  SphereGeometry,
  MeshPhongMaterial,
  DirectionalLight,
  PointLight,
} from 'three';
import { BaseLayer } from 'ore-three';

interface DemoLayerParam {
  name: string;
  canvas: HTMLCanvasElement;
}

export class DemoLayer extends BaseLayer {
  sphere?: Mesh;
  lights: any[] = [];
  readyAnimate: boolean = false;

  constructor(param: DemoLayerParam) {
    super({
      name: param.name || 'DemoLayer',
      canvas: param.canvas,
    });
  }

  onBind() {
    this.camera.position.set(0, 0, 6);
    this.camera.aspect = this.info.size.canvasAspectRatio;
    this.camera.updateProjectionMatrix();
    this.camera.lookAt(0, 0, 0);

    // Add lights
    const dirLight = new DirectionalLight(0xffffff, 1);
    dirLight.position.set(1, 1, 1);
    this.scene.add(dirLight);
    this.lights.push(dirLight);

    const pointLight = new PointLight(0x00ff88, 1, 10);
    pointLight.position.set(-2, 2, 2);
    this.scene.add(pointLight);
    this.lights.push(pointLight);

    // Create sphere
    this.sphere = new Mesh(
      new SphereGeometry(1, 32, 32),
      new MeshPhongMaterial({
        color: 0x0088ff,
        shininess: 100,
        specular: 0x111111,
      })
    );

    this.scene.add(this.sphere);

    this.readyAnimate = true;
    this.onResize();
  }

  animate(deltaTime: number) {
    if (this.sphere) {
      this.sphere.rotation.x += deltaTime * 0.5;
      this.sphere.rotation.y += deltaTime * 0.3;
    }

    // Animate lights
    if (this.lights.length > 1) {
      const time = performance.now() * 0.001;
      this.lights[1].position.x = Math.sin(time) * 3;
      this.lights[1].position.z = Math.cos(time) * 3;
    }

    if (this.renderer) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  onResize() {
    if (this.camera) {
      this.camera.aspect = this.info.size.canvasAspectRatio;
      this.camera.updateProjectionMatrix();
    }
  }
}
