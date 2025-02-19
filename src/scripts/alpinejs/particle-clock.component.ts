import { SetupStage } from '@/scripts/webGL/setupStage'
import particleClockFragmentShader from '@/scripts/webGL/shaders/particleClock/fragment.glsl'
import particleClockVertexShader from '@/scripts/webGL/shaders/particleClock/vertex.glsl'
import Alpine from 'alpinejs'
import gsap from 'gsap'
import GUI from 'lil-gui'
import throttle from 'lodash/throttle'
import * as THREE from 'three'
import { clamp } from 'three/src/math/MathUtils.js'

type DigitTuple = [
  hourTens: string,
  hourOnes: string,
  minuteTens: string,
  minuteOnes: string,
  secondTens: string,
  secondOnes: string,
]

type DigitItem = {
  object: THREE.Points<THREE.PlaneGeometry, THREE.ShaderMaterial, THREE.Object3DEventMap>
  visible: boolean
  delay: number
}

Alpine.data('particleClock', () => {
  const gui = new GUI()
  let webGL!: SetupStage
  const timer = new THREE.Group()
  let timeDigits: DigitTuple = [
    '99', //（hour tens）
    '99', //（hour ones）
    '99', //（minute tens）
    '99', //（minute ones）
    '99', //（second tens）
    '99', //（second ones）
  ]
  const planeGeometry = new THREE.PlaneGeometry(1, 1, 32, 32 * 1.5)
  let digits: DigitItem[] = []
  const colons: THREE.Points<THREE.PlaneGeometry, THREE.ShaderMaterial, THREE.Object3DEventMap>[] =
    []
  const digitTextures: THREE.Texture[] = []
  let containerRef: HTMLDivElement | null
  // Loaders
  const textureLoader = new THREE.TextureLoader()

  return {
    guiParams: {
      bgColor: '#000000',
      primaryColor: '#2eff3c',
      secondaryColor: '#e51f1f',
      uParticleSize: 0.023,
      fallDistance: 0.6,
    },
    async init() {
      this.setDom()
      if (!containerRef) return

      // webGL
      webGL = new SetupStage({
        container: containerRef,
        ambientLight: false,
        perspectiveCamera: true,
        orthographicCamera: false,
      })
      webGL.camera.position.z = 1
      webGL.scene.background = new THREE.Color(this.guiParams.bgColor)
      webGL.camera.position.y = 0
      webGL.camera.position.z = 5

      webGL.scene.add(timer)

      this.addObjects()
      this.setPositionCenter()
      this.setupTick()
      this.updateTime()
      setInterval(() => {
        this.updateTime()
      }, 1000)
      setTimeout(() => {
        this.showColons()
      }, 200)
      this.setGui()

      // Resize
      const throttledOnResize = throttle(this.onResize.bind(this), 300)
      const ro = new ResizeObserver(() => {
        throttledOnResize()
      })
      ro.observe(containerRef)
    },
    addObjects() {
      // load number texture
      for (let i = 0; i < 10; i++) {
        digitTextures.push(textureLoader.load(`/post/particle-clock/images/${i}.png`))
      }

      // fit image aspect
      planeGeometry.scale(1.2 * 0.8, 1.8 * 0.8, 1)

      // create base material
      const baseMaterial = new THREE.ShaderMaterial({
        vertexShader: particleClockVertexShader,
        fragmentShader: particleClockFragmentShader,
        transparent: true,
        // blending: THREE.AdditiveBlending,
        uniforms: {
          uResolution: new THREE.Uniform(
            new THREE.Vector2(webGL.width * webGL.pixelRatio, webGL.height * webGL.pixelRatio),
          ),
          uTime: new THREE.Uniform(0),
          uScale: new THREE.Uniform(1),
          uColor: new THREE.Uniform(new THREE.Color(this.guiParams.primaryColor)),
          uFinalColor: new THREE.Uniform(new THREE.Color(this.guiParams.secondaryColor)),
          uFallDistance: new THREE.Uniform(this.guiParams.fallDistance),
          uShowProgress: new THREE.Uniform(0),
          uFallProgress: new THREE.Uniform(0),
          uParticleSize: new THREE.Uniform(this.guiParams.uParticleSize),
          uTexture: new THREE.Uniform(digitTextures[0]),
        },
      })

      // 2枚ずつ重ねた数字のPointsを12個生成（6桁分）
      digits = Array.from({ length: 12 }, (_, i) => {
        const material = baseMaterial.clone()
        const points = new THREE.Points(planeGeometry, material)
        points.renderOrder = i
        // インデックスが偶数なら表示、奇数なら非表示
        const isVisible = i % 2 === 0
        points.visible = isVisible
        // timer グループに追加
        timer.add(points)
        const indexFromLast = Math.trunc((11 - i) / 2)
        return { object: points, visible: isVisible, delay: 0.015 * indexFromLast }
      })

      // colon
      const colonMaterial = baseMaterial.clone()
      colonMaterial.uniforms.uTexture.value = textureLoader.load(
        '/post/particle-clock/images/colon.png',
      )
      // colonMaterial.uniforms.uShowProgress.value = 1
      const colon = new THREE.Points(planeGeometry, colonMaterial)
      colons.push(colon, colon.clone())
      timer.add(...colons)
    },
    setPositionCenter() {
      const digitSpacing = 0.75 // 数字グループの幅
      const colonSpacing = 0.24 // コロンの幅
      const gap = 0.06 // 各グループ間の隙間
      const groups = [
        { type: 'digit', width: digitSpacing },
        { type: 'digit', width: digitSpacing },
        { type: 'colon', width: colonSpacing },
        { type: 'digit', width: digitSpacing },
        { type: 'digit', width: digitSpacing },
        { type: 'colon', width: colonSpacing },
        { type: 'digit', width: digitSpacing },
        { type: 'digit', width: digitSpacing },
      ] as const

      let planeIndex = 0
      let colonIndex = 0
      let currentX = 0

      groups.forEach((group, i) => {
        const groupCenter = currentX + group.width / 2
        if (group.type === 'digit') {
          const frontPlane = digits[planeIndex].object
          const backPlane = digits[planeIndex + 1].object
          frontPlane.position.x = groupCenter
          backPlane.position.x = groupCenter
          planeIndex += 2
        } else if (group.type === 'colon') {
          const colon = colons[colonIndex]
          colon.position.x = groupCenter
          timer.add(colon)
          colonIndex++
        }
        // 次のグループの開始位置
        currentX += group.width + gap
      })

      const timerBox = new THREE.Box3().setFromObject(timer)
      const center = new THREE.Vector3()
      timerBox.getCenter(center)
      timer.position.x = -center.x
    },
    setDom() {
      containerRef = this.$refs.container as HTMLDivElement | null
    },
    setGui() {
      gui.addColor(this.guiParams, 'bgColor').onChange((color: string) => {
        webGL.scene.background = new THREE.Color(color)
      })
      gui.addColor(this.guiParams, 'primaryColor').onChange((color: string) => {
        for (const digit of digits) {
          digit.object.material.uniforms.uColor.value.set(color)
        }
        for (const colon of colons) {
          colon.material.uniforms.uColor.value.set(color)
        }
      })
      gui.addColor(this.guiParams, 'secondaryColor').onChange((color: string) => {
        for (const digit of digits) {
          digit.object.material.uniforms.uFinalColor.value.set(color)
        }
      })
      gui
        .add(this.guiParams, 'uParticleSize')
        .min(0.001)
        .max(0.1)
        .step(0.001)
        .onChange((value: number) => {
          for (const digit of digits) {
            digit.object.material.uniforms.uParticleSize.value = value
          }
          for (const colon of colons) {
            colon.material.uniforms.uParticleSize.value = value
          }
        })
      gui
        .add(this.guiParams, 'fallDistance')
        .min(0.3)
        .max(5)
        .step(0.1)
        .name('uFallDistance')
        .onChange((value: number) => {
          for (const digit of digits) {
            digit.object.material.uniforms.uFallDistance.value = value
          }
        })
    },
    updateTime() {
      const now = new Date()
      const hours = now.getHours().toString().padStart(2, '0')
      const minutes = now.getMinutes().toString().padStart(2, '0')
      const seconds = now.getSeconds().toString().padStart(2, '0')
      // 時刻を分解して、6つの数字にする（例："12:34:56" → ['1','2','3','4','5','6']）
      const oldTimeDigits = timeDigits
      const newTimeDigits = [...hours, ...minutes, ...seconds] as DigitTuple

      // 各桁ごとに更新が必要かチェックして、該当する要素のみ更新する
      for (let i = 0; i < newTimeDigits.length; i++) {
        if (oldTimeDigits[i] === newTimeDigits[i]) continue

        const i2 = i * 2
        const digitValue = parseInt(newTimeDigits[i], 10)
        const frontPoint = digits[i2]
        const backPoint = digits[i2 + 1]
        if (frontPoint.visible) {
          this.hideObject(frontPoint)
          setTimeout(
            () => {
              this.showObject(backPoint)
            },
            300 + backPoint.delay * 1000,
          )
          backPoint.object.material.uniforms.uTexture.value = digitTextures[digitValue]
        } else {
          this.hideObject(backPoint)
          setTimeout(
            () => {
              this.showObject(frontPoint)
            },
            300 + frontPoint.delay * 1000,
          )
          frontPoint.object.material.uniforms.uTexture.value = digitTextures[digitValue]
        }
        // update
        timeDigits = newTimeDigits
      }
    },
    hideObject(target: DigitItem) {
      target.visible = false
      gsap.fromTo(
        target.object.material.uniforms.uFallProgress,
        {
          value: 0,
        },
        {
          value: 1,
          duration: 1.25,
          delay: target.delay,
          overwrite: true,
          ease: 'power2.inOut',
          onComplete: () => {
            target.object.visible = false
            // reset progress
            target.object.material.uniforms.uFallProgress.value = 0
          },
        },
      )
    },
    showObject(target: DigitItem) {
      target.visible = true
      target.object.visible = true
      gsap.fromTo(
        target.object.material.uniforms.uShowProgress,
        {
          value: 0,
        },
        {
          value: 1,
          duration: 0.7,
          overwrite: true,
        },
      )
    },
    showColons() {
      for (const colon of colons) {
        gsap.fromTo(
          colon.material.uniforms.uShowProgress,
          {
            value: 0,
          },
          {
            value: 1,
            duration: 0.7,
            overwrite: true,
          },
        )
      }
    },
    onResize() {
      const containerWidth = containerRef ? containerRef.clientWidth : window.innerWidth
      // ここはデザイン時の基準幅（必要に応じて調整）
      const baseWidth = 1800
      const scale: number = clamp(containerWidth / baseWidth, 0.5, 1)
      timer.position.set(0, 0, timer.position.z)

      timer.scale.set(scale, scale, scale)
      timer.updateWorldMatrix(true, true)

      const timerBox = new THREE.Box3().setFromObject(timer)
      const center = new THREE.Vector3()
      timerBox.getCenter(center)

      // 中央に配置
      timer.position.set(-center.x, -center.y, timer.position.z)

      console.log('scale', scale)
      for (const digit of digits) {
        digit.object.material.uniforms.uScale.value = scale
      }
      for (const colon of colons) {
        colon.material.uniforms.uScale.value = scale
      }
    },
    setupTick() {
      webGL.tick = () => {
        for (const digit of digits) {
          digit.object.material.uniforms.uTime.value = webGL.elapsedTime
        }
      }
    },
  }
})
