import * as THREE from 'three'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'

function beforeUpload (file) {
  const ext = file.name.split('.').pop().toLowerCase()
  const supported = ['fbx', 'gltf', 'glb']
  if (!supported.includes(ext)) {
    this.$message.error('仅支持 FBX / GLTF / GLB 格式的模型文件')
    return false
  }
  this.resetState()
  return true
}

function handleUpload (options) {
  const { file, onSuccess, onError } = options
  this.loading = true
  this.processFile(file)
    .then(() => {
      onSuccess()
    })
    .catch((err) => {
      console.error(err)
      this.$message.error('模型处理失败，请检查文件是否有效')
      onError(err)
    })
    .finally(() => {
      this.loading = false
    })
}

async function processFile (rawFile, options = {}) {
  const { silent = false, preserveMaterials = true } = options
  const buffer = await this.readFileAsArrayBuffer(rawFile)
  try {
    this.silentMode = silent
    await this.loadModel(rawFile, buffer, { silent, preserveMaterials })
    const views = await this.generateViews()
    return views
  } finally {
    this.silentMode = false
  }
}

function readFileAsArrayBuffer (file) {
  if (file.arrayBuffer) {
    return file.arrayBuffer()
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (event) => resolve(event.target.result)
    reader.onerror = (err) => reject(err)
    reader.readAsArrayBuffer(file)
  })
}

async function loadModel (file, buffer, options = {}) {
  if (!this.scene) {
    this.initThree()
  }
  this.clearModel()
  const name = typeof file === 'string' ? file : (file && file.name) ? file.name : ''
  const ext = name.split('.').pop().toLowerCase()
  if (ext === 'fbx') {
    await this.loadFBX(file, buffer, options)
  } else if (ext === 'gltf' || ext === 'glb') {
    await this.loadGLTF(file, buffer, options)
  } else {
    throw new Error('Unsupported format')
  }
}

async function loadFBX (file, buffer, options = {}) {
  const loader = new FBXLoader()
  if (loader.setCrossOrigin) {
    loader.setCrossOrigin('anonymous')
  }
  const isBlob = file instanceof Blob
  if (isBlob) {
    const url = URL.createObjectURL(file)
    try {
      const object = await loader.loadAsync(url)
      this.onModelLoaded(object, options)
    } finally {
      URL.revokeObjectURL(url)
    }
  } else {
    const object = loader.parse(buffer, '')
    this.onModelLoaded(object, options)
  }
}

function loadGLTF (file, buffer, options = {}) {
  const loader = new GLTFLoader()
  const isBlob = file instanceof Blob
  if (isBlob) {
    const url = URL.createObjectURL(file)
    return loader.loadAsync(url)
      .then((gltf) => {
        const object = gltf.scene || gltf.scenes?.[0]
        if (!object) {
          throw new Error('GLTF 模型为空')
        }
        this.onModelLoaded(object, options)
      })
      .finally(() => {
        URL.revokeObjectURL(url)
      })
  }
  return new Promise((resolve, reject) => {
    loader.parse(
      buffer,
      '',
      (gltf) => {
        const object = gltf.scene || gltf.scenes[0]
        if (!object) {
          reject(new Error('GLTF 模型为空'))
          return
        }
        this.onModelLoaded(object, options)
        resolve()
      },
      (err) => reject(err)
    )
  })
}

function onModelLoaded (object, options = {}) {
  const box = new THREE.Box3().setFromObject(object)
  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())
  const maxDim = Math.max(size.x, size.y, size.z) || 1
  this.viewDistance = maxDim * 2

  object.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true
      child.receiveShadow = true
      const materials = Array.isArray(child.material) ? child.material : [child.material]
      materials.forEach((mat) => {
        if (!mat) return
        if (options.preserveMaterials !== false) {
          if (mat.map && mat.map.colorSpace !== THREE.SRGBColorSpace) {
            mat.map.colorSpace = THREE.SRGBColorSpace
            mat.map.needsUpdate = true
          }
        }
        mat.side = THREE.DoubleSide
        mat.needsUpdate = true
      })
    }
  })

  object.position.sub(center)
  this.scene.add(object)
  this.model = object

  this.camera.position.set(this.viewDistance, this.viewDistance, this.viewDistance)
  this.camera.lookAt(new THREE.Vector3(0, 0, 0))
  this.renderScene()
  if (!options.silent && !this.silentMode) {
    this.$message.success('模型加载成功，正在生成视图')
  }
}

async function generateViews () {
  if (!this.model) return
  this.images = []
  await this.waitForFrames(3)
  const d = this.viewDistance
  await this.captureView('front', new THREE.Vector3(0, 0, d), '正视图')
  await this.captureView('back', new THREE.Vector3(0, 0, -d), '后视图')
  await this.captureView('left', new THREE.Vector3(-d, 0, 0), '左视图')
  await this.captureView('right', new THREE.Vector3(d, 0, 0), '右视图')
  await this.captureView('top', new THREE.Vector3(0, d, 0), '俯视图', new THREE.Vector3(0, 0, -1))
  await this.captureView('bottom', new THREE.Vector3(0, -d, 0), '仰视图', new THREE.Vector3(0, 0, 1))
  await this.captureView('perspective', new THREE.Vector3(d, d, d), '透视图')
  return this.images.slice()
}

async function captureView (name, position, label, upOverride) {
  const targetWidth = 1920
  const targetHeight = 1080
  const prevSize = new THREE.Vector2()
  this.renderer.getSize(prevSize)
  const prevPixelRatio = this.renderer.getPixelRatio()
  const prevAspect = this.camera.aspect
  const prevStyleWidth = this.renderer.domElement.style.width
  const prevStyleHeight = this.renderer.domElement.style.height

  this.renderer.setPixelRatio(1)
  this.renderer.setSize(targetWidth, targetHeight, false)
  this.renderer.domElement.style.width = `${targetWidth}px`
  this.renderer.domElement.style.height = `${targetHeight}px`
  this.camera.aspect = targetWidth / targetHeight
  this.camera.updateProjectionMatrix()

  this.camera.position.copy(position)
  if (upOverride) {
    this.camera.up.copy(upOverride)
  } else {
    this.camera.up.set(0, 1, 0)
  }
  this.camera.lookAt(new THREE.Vector3(0, 0, 0))
  await this.waitForFrames(2)
  const dataURL = this.renderer.domElement.toDataURL('image/png')
  const blob = this.dataURLToBlob(dataURL)
  this.images.push({
    name: `${name}.png`,
    label: label || name,
    blob,
    url: dataURL
  })

  this.renderer.setPixelRatio(prevPixelRatio)
  this.renderer.setSize(prevSize.x, prevSize.y, false)
  this.renderer.domElement.style.width = prevStyleWidth
  this.renderer.domElement.style.height = prevStyleHeight
  this.camera.aspect = prevAspect
  this.camera.updateProjectionMatrix()
  this.handleResize()
}

function waitForFrames (count = 1) {
  return new Promise((resolve) => {
    const tick = () => {
      this.renderScene()
      count--
      if (count <= 0) {
        resolve()
      } else {
        requestAnimationFrame(tick)
      }
    }
    requestAnimationFrame(tick)
  })
}

function dataURLToBlob (dataURL) {
  const arr = dataURL.split(',')
  const mime = arr[0].match(/:(.*?);/)[1]
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  return new Blob([u8arr], { type: mime })
}

async function downloadZip () {
  if (!this.images.length) return
  const zip = new JSZip()
  this.images.forEach((item) => {
    zip.file(item.name, item.blob)
  })
  const content = await zip.generateAsync({ type: 'blob' })
  saveAs(content, `model-views-${Date.now()}.zip`)
  this.$message.success('Zip 下载已开始')
}

function initThree () {
  if (this.renderer) return
  const container = this.getPreviewCanvas && this.getPreviewCanvas()
  if (!container) return
  const width = container.clientWidth || 600
  const height = container.clientHeight || 400

  this.renderer = new THREE.WebGLRenderer({
    antialias: true,
    preserveDrawingBuffer: true
  })
  this.renderer.outputColorSpace = THREE.SRGBColorSpace
  this.renderer.toneMapping = THREE.ACESFilmicToneMapping
  this.renderer.toneMappingExposure = 1.6
  this.renderer.physicallyCorrectLights = true
  this.renderer.shadowMap.enabled = true
  this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
  this.renderer.setPixelRatio(window.devicePixelRatio || 1)
  this.renderer.setSize(width, height)
  container.appendChild(this.renderer.domElement)

  this.scene = new THREE.Scene()
  this.applyBackgroundColor()
  this.pmremGenerator = new THREE.PMREMGenerator(this.renderer)
  const envScene = new RoomEnvironment()
  this.environmentRT = this.pmremGenerator.fromScene(envScene, 0.04)
  if (envScene.dispose) envScene.dispose()
  this.scene.environment = this.environmentRT.texture

  const ambient = new THREE.AmbientLight(0xffffff, 0.8)
  this.scene.add(ambient)

  const hemi = new THREE.HemisphereLight(0xffffff, 0x404040, 1)
  hemi.position.set(0, 60, 0)
  this.scene.add(hemi)

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.6)
  keyLight.position.set(25, 35, 20)
  keyLight.castShadow = true
  keyLight.shadow.mapSize.set(2048, 2048)
  keyLight.shadow.bias = -0.0005
  keyLight.target.position.set(0, 0, 0)
  this.scene.add(keyLight)
  this.scene.add(keyLight.target)

  const fillLight = new THREE.DirectionalLight(0xffffff, 1.1)
  fillLight.position.set(-30, 20, -25)
  this.scene.add(fillLight)

  const rimLight = new THREE.DirectionalLight(0xffffff, 0.7)
  rimLight.position.set(0, 40, -35)
  this.scene.add(rimLight)

  this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000)
  this.camera.position.set(5, 5, 5)
  this.camera.lookAt(new THREE.Vector3(0, 0, 0))

  this.renderScene()
}

function renderScene () {
  if (!this.renderer || !this.scene || !this.camera) return
  this.renderer.render(this.scene, this.camera)
}

function handleResize () {
  if (!this.renderer || !this.camera) return
  const container = this.getPreviewCanvas && this.getPreviewCanvas()
  if (!container) return
  const width = container.clientWidth
  const height = container.clientHeight || width * 0.66
  this.renderer.setSize(width, height)
  this.camera.aspect = width / height
  this.camera.updateProjectionMatrix()
  this.renderScene()
}

function resetState () {
  this.fileList = []
  this.images = []
  this.clearModel()
}

function resetBackground () {
  this.backgroundColor = '#bfbfbf'
}

function applyBackgroundColor () {
  if (!this.scene || !this.renderer) return
  const colorValue = this.backgroundColor || '#bfbfbf'
  const color = new THREE.Color(colorValue)
  this.scene.background = color
  this.renderer.setClearColor(color)
  this.renderScene()
}

function clearModel () {
  if (this.model && this.scene) {
    this.scene.remove(this.model)
    this.disposeObject(this.model)
    this.model = null
  }
}

function disposeObject (object) {
  object.traverse((child) => {
    if (child.isMesh) {
      if (child.geometry) child.geometry.dispose()
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((mat) => this.disposeMaterial(mat))
        } else {
          this.disposeMaterial(child.material)
        }
      }
    }
  })
}

function disposeMaterial (material) {
  Object.keys(material).forEach((key) => {
    const value = material[key]
    if (value && typeof value === 'object' && typeof value.dispose === 'function') {
      value.dispose()
    }
  })
  material.dispose && material.dispose()
}

function disposeScene () {
  this.clearModel()
  if (this.renderer) {
    this.renderer.dispose()
    if (this.renderer.domElement && this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement)
    }
    this.renderer = null
  }
  if (this.environmentRT) {
    this.environmentRT.dispose && this.environmentRT.dispose()
    this.environmentRT = null
  }
  if (this.pmremGenerator) {
    this.pmremGenerator.dispose()
    this.pmremGenerator = null
  }
  this.scene = null
  this.camera = null
}

export default {
  beforeUpload,
  handleUpload,
  processFile,
  readFileAsArrayBuffer,
  loadModel,
  loadFBX,
  loadGLTF,
  onModelLoaded,
  generateViews,
  captureView,
  waitForFrames,
  dataURLToBlob,
  downloadZip,
  initThree,
  renderScene,
  handleResize,
  resetState,
  resetBackground,
  applyBackgroundColor,
  clearModel,
  disposeObject,
  disposeMaterial,
  disposeScene
}

