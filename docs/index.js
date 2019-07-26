			import * as THREE from './three.module.js';

			import {
				OrbitControls
			} from './OrbitControls.js'

			let renderer, scene, camera, controls, target, vertices;

			let particles;

			const PARTICLE_SIZE = 20;
			const RADIUS=15;
			const AMOUNT_TO_ADD=0.3;

			let raycaster, intersects;
			let mouse, INTERSECTED;

			const file = document.files.inp;
			document.files.doit.onclick = async function () {
				document.files.style.display = 'none';
				await init();
				animate();
			}
			const re = /^.*$/gm;

			function getVertices() {
				return new Promise((resolve, reject) => {
					let vertices = [];
					const theFile = file.files[0];
					if (theFile) {
						let fr = new FileReader();
						fr.onload = function (e) {
							const text = e.target.result;
							const lines = text.match(re);
							let x_point, y_point, z_point;
							let index = 0;
							for (let line of lines) {
								if (line.startsWith("lat:")) {
									let throwaway;
									[throwaway, x_point, z_point] = line.match(/lat:\s+(-?\d+\.\d+)\s+lon:\s+(-?\d+\.\d+)/);
									x_point = 10 * parseInt(x_point);
									z_point = 10 * parseInt(z_point);
								} else if (line.match(/^\d{3}\./)) {
									let density, throwaway, _;
									[y_point, throwaway, _, density] = line.split(" ");
									vertices[index] = [x_point, 5 * parseFloat(y_point), z_point, density];
									index++;
								}
							}
							resolve(vertices);
						};
						fr.readAsText(theFile);
					}
				});
			}

			async function init() {

				let container = document.getElementById('container');

				scene = new THREE.Scene();

				camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 30, 1000);
				window.camera = camera;
				// camera.position.z = 100;
				// camera.position.x=100;
				camera.position.y = 300;
				controls = new OrbitControls(camera);

				//

				vertices = await getVertices();

				let positions = new Float32Array(vertices.length * 3);
				let colors = new Float32Array(vertices.length * 3);
				let sizes = new Float32Array(vertices.length);

				let color = new THREE.Color();
				console.log(vertices);
				for (let i = 0, l = vertices.length; i < l; i++) {

					[0, 1, 2].forEach(e => {
						positions[i * 3 + e] = vertices[i][e];
					});

					color.setHSL(0.01 + 0.1 * (vertices[i][3]), 1.0, 0.5);
					color.toArray(colors, i * 3);

					sizes[i] = vertices[i][3] == 0 ? 0 : PARTICLE_SIZE;

				}

				let geometry = new THREE.BufferGeometry();
				geometry.addAttribute('position', new THREE.BufferAttribute(positions, 3));
				geometry.addAttribute('customColor', new THREE.BufferAttribute(colors, 3));
				geometry.addAttribute('size', new THREE.BufferAttribute(sizes, 1));
				geometry.addAttribute('density', new THREE.BufferAttribute(new Float32Array(vertices.map(i => i[3])), 1));
				console.log(geometry);
				//

				let material = new THREE.ShaderMaterial({

					uniforms: {
						color: {
							value: new THREE.Color(0xffffff)
						},
						pointTexture: {
							value: new THREE.TextureLoader().load("disc.png")
						}
					},
					vertexShader: document.getElementById('vertexshader').textContent,
					fragmentShader: document.getElementById('fragmentshader').textContent,

					alphaTest: 0.9

				});

				//

				const coordMap = e => ["x", "y", "z"].map(i => e(i));
				particles = new THREE.Points(geometry, material); {
					let {
						min,
						max
					} = new THREE.Box3().setFromObject(particles);
					particles.position.set(...coordMap(i => (min[i] - max[i]) / 2));
				}
				scene.add(particles);
				controls.target.set(particles.position.x, particles.position.y, particles.position.z); {
					let geometry = new THREE.SphereGeometry(10);
					let material = new THREE.MeshBasicMaterial(0xFFFFFF);
					target = new THREE.Mesh(geometry, material);
					target.position.set(...coordMap(i => controls.target[i]));
					scene.add(target);
				}
				renderer = new THREE.WebGLRenderer();
				renderer.setPixelRatio(window.devicePixelRatio);
				renderer.setSize(window.innerWidth, window.innerHeight);
				container.appendChild(renderer.domElement);


				raycaster = new THREE.Raycaster();
				mouse = new THREE.Vector2();


				window.addEventListener('resize', onWindowResize, false);
				document.addEventListener('mousemove', onDocumentMouseMove, false);
			}

			function onDocumentMouseMove(event) {

				event.preventDefault();

				mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
				mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

			}

			function onWindowResize() {

				camera.aspect = window.innerWidth / window.innerHeight;
				camera.updateProjectionMatrix();

				renderer.setSize(window.innerWidth, window.innerHeight);

			}

			function animate() {

				requestAnimationFrame(animate);

				render();
				// 				stats.update();

			}

			function getPointCoords(pointNum) {
				return [0, 1, 2].map(i => particles.geometry.attributes.position.array[pointNum * 3 + i]);
			}

			function distance(origin, point) {
				return Math.sqrt([0, 1, 2].reduce((last, next) => last + (origin[next] - point[next]) ** 2, 0))
			}

			async function onClick() {
				if (INTERSECTED !== null) {
					let {
						attributes
					} = particles.geometry;
					let origin = getPointCoords(INTERSECTED);
					let color = new THREE.Color();
					for (let point in attributes.density.array) {
						let coords = getPointCoords(point);
						if (distance(coords, origin) < RADIUS) {
							attributes.density.array[point] += AMOUNT_TO_ADD;
							attributes.size.array[point] = PARTICLE_SIZE;
							color.setHSL(0.01 + 0.1 * (attributes.density.array[point]), 1.0, 0.5);
							color.toArray(attributes.customColor.array, point * 3);
						}
					}
					attributes.size.needsUpdate=true;
					attributes.customColor.needsUpdate=true;
				}
			}

			document.onclick=onClick;

			function render() {


				var geometry = particles.geometry;
				var attributes = geometry.attributes;

				raycaster.setFromCamera(mouse, camera);

				intersects = raycaster.intersectObject(particles);

				if (intersects.length > 0) {

					if (INTERSECTED != intersects[0].index) {

						attributes.size.array[INTERSECTED] = attributes.density.array[INTERSECTED] == 0 ? 0 : PARTICLE_SIZE;

						INTERSECTED = intersects[0].index;

						attributes.size.array[INTERSECTED] = PARTICLE_SIZE * 1.25;
						attributes.size.needsUpdate = true;

					}

				} else if (INTERSECTED !== null) {

					attributes.size.array[INTERSECTED] = attributes.density.array[INTERSECTED] == 0 ? 0 : PARTICLE_SIZE;
					attributes.size.needsUpdate = true;
					INTERSECTED = null;

				}

				renderer.render(scene, camera);

			}