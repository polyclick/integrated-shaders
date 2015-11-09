'use strict'

import THREE from 'three'
import TweenMax from 'gsap'
import $ from 'jquery'
import _ from 'lodash'
import clamp from 'clamp'
import analyser from 'web-audio-analyser'

class App {
  constructor() {

    this.SCALE_MULTIPLIER_LOW = 0.25
    this.SCALE_MULTIPLIER_HIGH = 4.0

    this.camera = null
    this.scene = null
    this.renderer = null
    this.mesh = null
    this.time = null
    this.clock = null

    // forked audio context
    this.audioContext = new (window.AudioContext ||
      window.webkitAudioContext ||
      window.mozAudioContext ||
      window.oAudioContext ||
      window.msAudioContext)()
    this.audio = null
    this.analyser = null
    this.audioCurrentTime = null

    this.params = {
      mousePosition: {
        x: 0,
        y: 0
      }
    }

    this.init()
    this.addListeners()
  }

  init() {

    // mobile
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
      $('html').addClass('detector-mobile-unsupported')
      return
    }

    // renderer
    this.renderer = new THREE.WebGLRenderer()
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    document.body.appendChild(this.renderer.domElement)

    // camera
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 10000)
    this.camera.position.z = 0

    // scene
    this.scene = new THREE.Scene()

    // geomertry & material
    let geometry = new THREE.PlaneGeometry(1000, 1000, 4, 1000)
    let material = new THREE.ShaderMaterial({
      uniforms: {
        u_time: { type: 'f', value: 1.0 },
        u_resolution: { type: 'v2', value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        u_volume: { type: 'f', value: 0.0 },
        u_mouse: { type: 'f', value: 0.0 }
      },
      vertexShader: document.getElementById('vertexShader').textContent,
      fragmentShader: document.getElementById('fragmentShader').textContent
    })
    material.side = THREE.DoubleSide

    // mesh
    this.mesh = new THREE.Mesh(geometry, material)
    this.mesh.position.z = -500
    this.scene.add(this.mesh)

    // clock
    this.clock = new THREE.Clock()

    // audio & analyser
    this.audio = new Audio()

    this.audio.addEventListener('canplay', () => {
      this.analyser = analyser(this.audio, this.audioContext, { audible: true, stereo: false })
      this.analyser.analyser.smoothingTimeConstant = 0.5
      this.audio.play()
    }, false)

    this.audio.addEventListener('timeupdate', () => {
      this.audioCurrentTime = this.audio.currentTime
    }, false)

    this.audio.src = 'audio/precussions-blatant-water-cannon.mp3'


    // render & animation ticker
    TweenMax.ticker.fps(60)
    TweenMax.ticker.addEventListener('tick', this.tick.bind(this))

    // resize
    window.addEventListener('resize', this.resize.bind(this), false)
  }

  addListeners() {
    $(window).mousemove((event) => {

      let mouseX = event.pageX / $(window).width()    // normalized between 0 and 1
      let mouseY = event.pageY / $(window).height()   // normalized between 0 and 1
      TweenMax.to(this.params.mousePosition, 1, { x: mouseX, y: mouseY, ease: Power3.easeOut })
    })

    $(window).click(() => {
      console.log(this.audio.currentTime)
    })
  }

  tick() {
    this.animate()
    this.render()
  }

  animate() {

    // rotate mesh
    this.mesh.rotation.y = (Math.PI / 180 * -45) + (Math.PI / 180.0 * -25 * this.params.mousePosition.x)

    // update mouse uniform
    this.mesh.material.uniforms.u_mouse.value = this.params.mousePosition.y

    // update time uniform
    this.mesh.material.uniforms.u_time.value = this.clock.getElapsedTime()

    // analyse audio
    if (this.analyser) {
      //let waveform = this.analyser.waveform()
      //let size = waveform.length

      // the amount of bars we want to show
      // 2, 4, 8, 16, 32, 64, ...
      const barsCount = 32

      // get a snapshot of the frequencies
      // this method return all the frequencies (depending on the fft size)
      // so if 1024 measure points are too much, group them together, see below
      let frequencies = this.analyser.frequencies()
      let size = frequencies.length

      // the amount of frequencies per bar (we have to group together)
      let frequenciesPerBar = size / barsCount



      // group frequencies together in frequency bars
      // we do this by summing up the frequencies that belong to the same bar and averaging them out
      // and when we are there, normalize to keep them between 0 and 1
      let barsData = []
      for (let barIndex = 0; barIndex < barsCount; barIndex++) {
        let sum = 0
        for (let frequencyIndex = 0; frequencyIndex < frequenciesPerBar; frequencyIndex++) {
          sum += frequencies[(barIndex * frequenciesPerBar) + frequencyIndex]
        }
        barsData[barIndex] = sum / frequenciesPerBar / 256
      }



      // calculate the average level over all the frequencies together
      // and normalize
      let level = 0
      for (let i = 0; i < frequencies.length; i++)
        level += frequencies[i] / 256
      level /= frequencies.length

      let lowLevel = 0
      let lowFrequencies = frequencies.slice(0, Math.round(frequencies.length / 3))
      for (let i = 0; i < lowFrequencies.length; i++)
        lowLevel += lowFrequencies[i] / 256
      lowLevel /= lowFrequencies.length

      // scale up on higher volumes
      //let multiplier = this.audioCurrentTime > 38.35 ? this.SCALE_MULTIPLIER_HIGH : this.SCALE_MULTIPLIER_LOW

      this.mesh.material.uniforms.u_volume.value = lowLevel
    }
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
}

// export already created instance
export let app = new App()
