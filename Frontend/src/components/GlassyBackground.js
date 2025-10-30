// GlassyBackground.jsx
import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import styles from './GlassyBackground.module.css';

const GlassyBackground = () => {
  const mountRef = useRef(null);
  const particlesRef = useRef([]);
  const rendererRef = useRef(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 15;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    rendererRef.current = renderer;
    mountRef.current.appendChild(renderer.domElement);

    // Glass particle material with enhanced properties
    const particleGeometry = new THREE.IcosahedronGeometry(0.2, 1);
    const particleMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x87ceeb,
      transparent: true,
      opacity: 0.6,
      metalness: 0.3,
      roughness: 0.2,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      reflectivity: 0.9,
      transmission: 0.98,
      ior: 1.52,
      envMapIntensity: 2.0,
      side: THREE.DoubleSide,
    });

    // Create particles with glass effect
    const particleCount = 150;
    for (let i = 0; i < particleCount; i++) {
      const particle = new THREE.Mesh(particleGeometry, particleMaterial);
      particle.position.set(
        (Math.random() - 0.5) * 40,
        (Math.random() - 0.5) * 25,
        (Math.random() - 0.5) * 15
      );
      particle.scale.setScalar(Math.random() * 0.5 + 0.5);
      particle.userData = {
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.03,
          (Math.random() - 0.5) * 0.03,
          (Math.random() - 0.5) * 0.02
        ),
        rotationSpeed: Math.random() * 0.03,
        baseOpacity: 0.6,
      };
      scene.add(particle);
      particlesRef.current.push(particle);
    }

    // Enhanced lighting
    const ambientLight = new THREE.AmbientLight(0xe6f0fa, 0.6);
    scene.add(ambientLight);
    
    const pointLight1 = new THREE.PointLight(0x87ceeb, 1.5, 100);
    pointLight1.position.set(5, 5, 5);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x4682b4, 1, 100);
    pointLight2.position.set(-5, -5, 5);
    scene.add(pointLight2);

    // Mouse interaction
    const mouse = new THREE.Vector2();
    const handleMouseMove = (event) => {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    };

    // Animation
    let animationFrameId;
    const animate = () => {
      const time = Date.now() * 0.001;
      
      particlesRef.current.forEach((particle, index) => {
        particle.position.add(particle.userData.velocity);
        particle.rotation.x += particle.userData.rotationSpeed;
        particle.rotation.y += particle.userData.rotationSpeed * 0.8;

        // Bounce particles
        if (particle.position.x > 20 || particle.position.x < -20) 
          particle.userData.velocity.x *= -1;
        if (particle.position.y > 12 || particle.position.y < -12) 
          particle.userData.velocity.y *= -1;

        // Subtle floating effect
        particle.position.y += Math.sin(time + index) * 0.005;

        // Mouse interaction with glow effect
        const dist = new THREE.Vector3(mouse.x * 20, mouse.y * 12, 0).distanceTo(particle.position);
        if (dist < 4) {
          particle.material.opacity = Math.min(0.9, particle.userData.baseOpacity + 0.3);
          particle.scale.setScalar(0.8);
        } else {
          particle.material.opacity = particle.userData.baseOpacity;
          particle.scale.setScalar(0.5 + Math.sin(time + index) * 0.2);
        }
      });

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };

    const handleResize = () => {
      if (!rendererRef.current) return;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('resize', handleResize);
    animate();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }

      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }

      particlesRef.current.forEach(particle => {
        scene.remove(particle);
        particle.geometry.dispose();
        particle.material.dispose();
      });
      particlesRef.current = [];

      if (rendererRef.current) {
        rendererRef.current.dispose();
        rendererRef.current = null;
      }
    };
  }, []);

  return <div ref={mountRef} className={styles.background}></div>;
};

export default GlassyBackground;