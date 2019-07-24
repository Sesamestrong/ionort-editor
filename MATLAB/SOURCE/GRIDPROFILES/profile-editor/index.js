			import 'regenerator-runtime/runtime';
			import * as THREE from 'three';

			var renderer, scene, camera, stats;

			var particles;

			var PARTICLE_SIZE = 20;

			var raycaster, intersects;
			var mouse, INTERSECTED;

            const file=document.files.inp;
            document.files.doit.onclick=async function(){
document.files.style.display='none';await init();animate();
            }
            const re=/^.*$/gm;
            function getVertices(){
                return new Promise((resolve,reject)=>{
                let vertices=[];
                const theFile=file.files[0];
                if(theFile){
                    let fr = new FileReader();
                    fr.onload = function(e)
                        {
                            const text=e.target.result;
                            const lines=text.match(re);
                            let x_point,y_point,z_point;
                            let index=0;
                            for(let line of lines){
                                if(line.startsWith("lat:")){
                                    let throwaway;
                                    [throwaway,x_point,z_point]=line.match(/lat:\s+(-?\d+\.\d+)\s+lon:\s+(-?\d+\.\d+)/);
                                }
                                else if(line.match(/^\d{3}\./)){
                                    let density;
                                    [y_point,density]=line.split(" ");
                                    vertices[index]=[x_point,y_point,z_point,density];
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

				var container = document.getElementById( 'container' );

				scene = new THREE.Scene();

				camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 10000 );
				camera.position.z = 250;

				//

                // var vertices = new THREE.BoxGeometry( 200, 200, 200, 16, 16, 16 ).vertices;
                var vertices=await getVertices();

				var positions = new Float32Array( vertices.length * 3 );
				var colors = new Float32Array( vertices.length * 3 );
				var sizes = new Float32Array( vertices.length );

				var vertex;
				var color = new THREE.Color();
				for ( var i = 0, l = vertices.length; i < l; i ++ ) {

                    [0,1,2].forEach(e=>{
                        positions[i*3+e]=vertices[i][e];
                    });

					color.setHSL( 0.01 + 0.1 * ( parseFloat(vertices[i][3])), 1.0, 0.5 );
					color.toArray( colors, i * 3 );

					sizes[ i ] = vertices[i][3]==0?0:PARTICLE_SIZE * 0.5;

				}

				var geometry = new THREE.BufferGeometry();
				geometry.addAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
				geometry.addAttribute( 'customColor', new THREE.BufferAttribute( colors, 3 ) );
				geometry.addAttribute( 'size', new THREE.BufferAttribute( sizes, 1 ) );

				//

				var material = new THREE.ShaderMaterial( {

					uniforms: {
						color: { value: new THREE.Color( 0xffffff ) },
						pointTexture: { value: new THREE.TextureLoader().load( "textures/sprites/disc.png" ) }
					},
					vertexShader: document.getElementById( 'vertexshader' ).textContent,
					fragmentShader: document.getElementById( 'fragmentshader' ).textContent,

					alphaTest: 0.9

				} );

				//

				particles = new THREE.Points( geometry, material );
				scene.add( particles );

				//

				renderer = new THREE.WebGLRenderer();
				renderer.setPixelRatio( window.devicePixelRatio );
				renderer.setSize( window.innerWidth, window.innerHeight );
				container.appendChild( renderer.domElement );

				//

				raycaster = new THREE.Raycaster();
				mouse = new THREE.Vector2();

				//

				//

				window.addEventListener( 'resize', onWindowResize, false );
				document.addEventListener( 'mousemove', onDocumentMouseMove, false );
			}

			function onDocumentMouseMove( event ) {

				event.preventDefault();

				mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
				mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

			}

			function onWindowResize() {

				camera.aspect = window.innerWidth / window.innerHeight;
				camera.updateProjectionMatrix();

				renderer.setSize( window.innerWidth, window.innerHeight );

			}

			function animate() {

				requestAnimationFrame( animate );

				render();
				stats.update();

			}

			function render() {

				particles.rotation.x += 0.0005;
				particles.rotation.y += 0.001;

				var geometry = particles.geometry;
				var attributes = geometry.attributes;

				raycaster.setFromCamera( mouse, camera );

				intersects = raycaster.intersectObject( particles );

				if ( intersects.length > 0 ) {

					if ( INTERSECTED != intersects[ 0 ].index ) {

						attributes.size.array[ INTERSECTED ] = PARTICLE_SIZE;

						INTERSECTED = intersects[ 0 ].index;

						attributes.size.array[ INTERSECTED ] = PARTICLE_SIZE * 1.25;
						attributes.size.needsUpdate = true;

					}

				} else if ( INTERSECTED !== null ) {

					attributes.size.array[ INTERSECTED ] = PARTICLE_SIZE;
					attributes.size.needsUpdate = true;
					INTERSECTED = null;

				}

				renderer.render( scene, camera );

			}