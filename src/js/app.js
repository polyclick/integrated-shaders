'use strict'

import THREE from 'three'
import TweenMax from 'gsap'
import $ from 'jquery'
import clamp from 'clamp'

class App {
  constructor() {
    this.camera = null
    this.scene = null
    this.renderer = null
    this.mesh = null
    this.clock = null

    // forked audio context
    this.audioContext = new (window.AudioContext ||
      window.webkitAudioContext ||
      window.mozAudioContext ||
      window.oAudioContext ||
      window.msAudioContext)()
    this.audio = null

    this.params = {
      normalizedMousePosition: 0
    }

    this.init()
    this.addListeners()
  }

  init() {
    // renderer
    this.renderer = new THREE.WebGLRenderer()
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    document.body.appendChild(this.renderer.domElement)

    // camera
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 1000)
    this.camera.position.z = 400

    // scene
    this.scene = new THREE.Scene()

    // geomertry & material
    let geometry = new THREE.PlaneGeometry(350, 350, 4, 350)
    let material = new THREE.ShaderMaterial({
      uniforms: {
        u_time: { type: 'f', value: 1.0 },
        u_resolution: { type: 'v2', value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        u_volume: { type: 'f', value: 1.0 },
        u_fft: { type: 'fv1', value: [] }
      },
      vertexShader: document.getElementById('vertexShader').textContent,
      fragmentShader: document.getElementById('fragmentShader').textContent
    })
    material.side = THREE.DoubleSide

    // mesh
    this.mesh = new THREE.Mesh(geometry, material)
    this.scene.add(this.mesh)

    // clock
    this.clock = new THREE.Clock()

    // audio
    this.audio = new Audio()

    this.audio.addEventListener('canplay', () => {
      this.monitorVolumeOnStream(this.audio)
      this.audio.play()
    }, false)

    this.audio.src = 'audio/slumberjack-horus.mp3'

    // // audio
    // SoundcloudBadge({
    //   client_id: '7fb1348d9e4adc9440ffb61b4b210e66',
    //   song: 'https://soundcloud.com/slumberjack-music/horus-1',
    //   dark: false,
    //   getFonts: true
    // }, (err, src, data, div) => {
    //   if (err) throw err


    //   //this.audio.crossOrigin = 'Anonymous'
    //   //this.audio.loop = true
    //   // this.audio.addEventListener('canplay', () => {
    //   //   console.log('Playing audio...')
    //   //   this.audio.play()
    //   // }, false)



    //   //this.monitorVolumeOnStream(this.audio)

    //   // Metadata related to the song
    //   // retrieved by the API.
    //   console.log(data)
    // })

    // https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Visualizations_with_Web_Audio_API

    // render & animation ticker
    TweenMax.ticker.fps(60)
    TweenMax.ticker.addEventListener('tick', this.tick.bind(this))

    // resize
    window.addEventListener('resize', this.resize.bind(this), false)
  }

  addListeners() {
    $(window).mousemove((event) => {
      var normalizedMousePosition = (-2 * event.pageX / $(window).width()) + 1
      TweenMax.to(this.params, 0.25, { normalizedMousePosition: normalizedMousePosition })
    })
  }

  tick() {
    this.animate()
    this.render()
  }

  animate() {
    // this.mesh.rotation.x += 0.0025
    // this.mesh.rotation.y -= 0.005
    this.mesh.rotation.y = Math.PI * this.params.normalizedMousePosition
    this.mesh.material.uniforms.u_time.value = this.clock.getElapsedTime()
  }

  render() {
    this.renderer.render(this.scene, this.camera)
  }

  resize() {
    // update camera
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()

    // update renderer
    this.renderer.setSize(window.innerWidth, window.innerHeight)
  }

  monitorVolumeOnStream(audio) {

    // create source from the audio
    // let source = audioContext.createMediaStreamSource(stream)
    let source = this.audioContext.createMediaElementSource(audio)

    // connect the source to the destination (sound -> output)
    source.connect(this.audioContext.destination)

    // create an analyzer
    let analyser = this.audioContext.createAnalyser()
    analyser.smoothingTimeConstant = 0.5
    analyser.fftSize = 256

    // connect the source to the analyser (sound -> analyser)
    source.connect(analyser)

    // create a script processor that processes incoming audio
    // create the audioprocess on the global window scope to
    // prevent garbage collection of this anonymous function
    let bufferLength = analyser.frequencyBinCount
    let data = new Uint8Array(bufferLength)
    let levelChecker = this.audioContext.createScriptProcessor(256, 1, 1)

    levelChecker.onaudioprocess = window.audioProcess = () => {

      // put the frequency data into our data array
      analyser.getByteFrequencyData(data)

      // read average volume & normalize
      let average = this.getAverageVolume(data)
      let normalizedVolume = clamp((average / 100), 0.0, 1.0)

      for (var i = 0; i < data.length; i++) {
        this.mesh.material.uniforms.u_fft.value[i] = data[i] / 255
      }

      this.mesh.material.uniforms.u_volume.value = normalizedVolume

      // this.mesh.scale.set(scale, scale, scale)
      // console.log(average)
      // $('#level-meter').height(average + '%')
    }

    // connect the level check to the destination
    levelChecker.connect(this.audioContext.destination)
  }

  getAverageVolume(array) {
    var values = 0
    var length = array.length
    for (var i = 0; i < length; i++)
      values += array[i]
    return values / length
  }
}

// export already created instance
export let app = new App()
