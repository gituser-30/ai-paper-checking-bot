import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

const ThreeBackground = () => {
  const mountRef = useRef(null);

  useEffect(() => {
    const scene = new THREE.Scene();
    // Add subtle fog to blend distant stars into the background
    scene.fog = new THREE.FogExp2(0x060714, 0.001);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // performance optimization
    mountRef.current.appendChild(renderer.domElement);

    // Create particle systems with different colors for cosmic depth
    const createStars = (count, color, size, zOffset) => {
      const geometry = new THREE.BufferGeometry();
      const vertices = [];
      for (let i = 0; i < count; i++) {
        vertices.push(THREE.MathUtils.randFloatSpread(2000)); // x
        vertices.push(THREE.MathUtils.randFloatSpread(2000)); // y
        vertices.push(THREE.MathUtils.randFloatSpread(2000) - zOffset); // z
      }
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      
      const material = new THREE.PointsMaterial({
        color: color,
        size: size,
        transparent: true,
        opacity: Math.random() * 0.5 + 0.5,
        blending: THREE.AdditiveBlending,
      });
      
      return new THREE.Points(geometry, material);
    };

    const stars1 = createStars(3000, 0xffffff, 1.5, 0); // White stars
    const stars2 = createStars(1500, 0x00f0ff, 2.0, 200); // Neon cyan stars
    const stars3 = createStars(1500, 0x8a2be2, 2.5, 400); // Electric purple stars

    scene.add(stars1);
    scene.add(stars2);
    scene.add(stars3);

    camera.position.z = 800;

    // Mouse interaction parameters
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const windowHalfX = window.innerWidth / 2;
    const windowHalfY = window.innerHeight / 2;

    const onDocumentMouseMove = (event) => {
      mouseX = (event.clientX - windowHalfX) * 0.5;
      mouseY = (event.clientY - windowHalfY) * 0.5;
    };

    window.addEventListener('mousemove', onDocumentMouseMove);

    const clock = new THREE.Clock();

    const animate = () => {
      requestAnimationFrame(animate);
      
      const elapsedTime = clock.getElapsedTime();

      // Smooth camera interpolation (Parallax)
      targetX = mouseX * 0.5;
      targetY = mouseY * 0.5;
      camera.position.x += (targetX - camera.position.x) * 0.05;
      camera.position.y += (-targetY - camera.position.y) * 0.05;
      camera.lookAt(scene.position);

      // Rotate particle systems slowly
      stars1.rotation.y = elapsedTime * 0.02;
      stars2.rotation.y = elapsedTime * 0.03;
      stars3.rotation.y = elapsedTime * 0.01;
      
      stars2.rotation.x = elapsedTime * 0.01;
      stars3.rotation.z = elapsedTime * 0.02;

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    const currentMount = mountRef.current;
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', onDocumentMouseMove);
      if (currentMount && renderer.domElement) {
        currentMount.removeChild(renderer.domElement);
      }
      
      // Cleanup geometries and materials
      stars1.geometry.dispose(); stars1.material.dispose();
      stars2.geometry.dispose(); stars2.material.dispose();
      stars3.geometry.dispose(); stars3.material.dispose();
      renderer.dispose();
    };
  }, []);

  return <div id="three-canvas" ref={mountRef} style={{position: 'fixed', top: 0, left: 0, zIndex: -2}} />;
};

export default ThreeBackground;
