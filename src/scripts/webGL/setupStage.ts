import Stats from 'stats-gl'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

export class SetupStage {
  container: HTMLElement
  width: number = 0
  height: number = 0

  clock: THREE.Clock
  elapsedTime: number = 0

  scene: THREE.Scene = new THREE.Scene()
  camera: THREE.Camera
  renderer: THREE.WebGLRenderer
  ambientLight: THREE.AmbientLight | undefined
  orbitControls: OrbitControls | undefined
  pixelRatio: number = Math.min(2, window.devicePixelRatio)
  tick: (() => void) | undefined = undefined

  stats: any

  constructor(options: {
    container: HTMLElement
    perspectiveCamera?: boolean
    orthographicCamera?: boolean
    ambientLight: boolean
  }) {
    const {
      container,
      perspectiveCamera = true,
      orthographicCamera = false,
      ambientLight,
    } = options

    this.container = container
    this.width = this.container.offsetWidth
    this.height = this.container.offsetHeight

    this.clock = new THREE.Clock()
    this.scene = new THREE.Scene()

    this.setCamera(perspectiveCamera, orthographicCamera)

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    })
    this.container.appendChild(this.renderer.domElement)

    if (ambientLight) {
      this.ambientLight = new THREE.AmbientLight(0xffffff, 6)
      this.scene.add(this.ambientLight)
    }

    // OrbitControls
    if (this.camera instanceof THREE.PerspectiveCamera) {
      this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement)
      this.orbitControls.enableDamping = true
    }

    this.resize()
    this.setupResize()
    this.render()

    if (import.meta.env.DEV) {
      this.stats = new Stats()
      document.body.append(this.stats.domElement)
      this.stats.begin()
    }
  }

  setCamera(perspectiveCamera: boolean, orthographicCamera: boolean) {
    if (perspectiveCamera) {
      this.camera = new THREE.PerspectiveCamera(70, this.width / this.height, 0.01, 100)
      this.camera.position.z = 3
    } else if (orthographicCamera) {
      this.camera = new THREE.OrthographicCamera(
        -this.width * 0.5,
        this.width * 0.5,
        this.height * 0.5,
        -this.height * 0.5,
        0.01,
        1000,
      )
      this.camera.position.z = 1
    }
    if (this.camera) {
      this.scene.add(this.camera)
    }
  }

  setupResize() {
    window.addEventListener('resize', this.resize.bind(this))
  }

  resize() {
    this.width = this.container.offsetWidth
    this.height = this.container.offsetHeight
    this.pixelRatio = Math.min(2, window.devicePixelRatio)

    this.renderer.setSize(this.width, this.height)
    this.renderer.setPixelRatio(this.pixelRatio)

    if (this.camera instanceof THREE.PerspectiveCamera) {
      this.camera.aspect = this.width / this.height
      this.camera.updateProjectionMatrix()
    }
    if (this.camera instanceof THREE.OrthographicCamera) {
      this.camera.left = this.width * -0.5
      this.camera.right = this.width * 0.5
      this.camera.top = this.height * 0.5
      this.camera.bottom = this.height * -0.5
      this.camera.updateProjectionMatrix()
    }
  }

  protected render() {
    this.elapsedTime = this.clock.getElapsedTime()

    if (this.orbitControls) {
      this.orbitControls.update()
    }
    if (this.tick) {
      this.tick()
    }
    if (this.stats) {
      this.stats.update()
    }

    this.renderer.render(this.scene, this.camera)
    window.requestAnimationFrame(this.render.bind(this))
  }
}
