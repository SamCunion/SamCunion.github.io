/**
 * Handles the background cuboid animation logic with three.js.
 */

import * as THREE from "three";
import { OBB } from "three/addons/math/OBB.js";

(function() {

    const scroll_max_dist = 10; //changes how far the background scrolls
    const scroll_snappiness = 4; //changes how "jumpy" the scroll damping is
    const no_cubes = 20;

    //initiate three.js renderer
    const canvas = document.querySelector("#background-animation");
    const renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        alpha: true
    })

    //cap pixelratio for improved mobile performance
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();
    scene.background = backgroundGradient();
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    camera.position.z = 5;
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const key = new THREE.DirectionalLight(0xb48cff, 2);
    key.position.set(3, 5, 4);
    scene.add(key);


    //create objects
    const cuboids = [];
    for (let i = 0; i < no_cubes; i++) {
        const l = THREE.MathUtils.randFloat(1, 3);
        const w = THREE.MathUtils.randFloat(0.3, 0.8);
        const h = THREE.MathUtils.randFloat(0.3, 0.8);

        //set cuboid sizes
        const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(w, l, h),
            new THREE.MeshStandardMaterial({
                color: 0x6a3fd1,
                roughness: 0.35,
                metalness: 0.4
            })
        )

        //set cuboid position
        while (true) {
            const z = THREE.MathUtils.randFloat(-4, 1);
            const { halfW, halfH } = halfExtents(z);
            const x = halfW * 0.9 * Math.sin((Math.random() - 0.5) * Math.PI);
            const y = THREE.MathUtils.randFloat(-scroll_max_dist - halfH, halfH);
            mesh.position.set(x, y, z);

            //check if collision with any other current cuboid
            const trial_obb = getOBB(mesh);
            let intersection_found = false;
            for (let c of cuboids) {
                if (trial_obb.intersectsOBB(getOBB(c))) {
                    intersection_found = true;
                    break;
                }
            }
            if (intersection_found) {
                continue;
            }
            break;
        }

        //set cuboid orientation
        mesh.quaternion.random();

        //set rotation speed, direction around the Y axis
        mesh.userData.spin = THREE.MathUtils.randFloat(0.2, 0.8) * (Math.random() > 0.5 ? -1 : 1);

        //add to scene
        scene.add(mesh);
        cuboids.push(mesh);
    }


    //handle window resize
    function resize() {
        renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
        camera.aspect = canvas.clientWidth / canvas.clientHeight;
        camera.updateProjectionMatrix();
    }
    window.addEventListener("resize", resize);
    resize();

    //handle window scroll
    let scroll_progress = 0;
    function updateScroll() {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        scroll_progress = max > 0 ? window.scrollY / max : 0;
    }
    window.addEventListener("scroll", updateScroll, {passive: true});
    window.addEventListener("resize", updateScroll);

    //set animation rendering
    let last = 0;
    let camY = 0;
    renderer.setAnimationLoop((t) => {
        
        const dt = (t - last) / 1000;
        last = t;

        //handle scroll perspective change
        const targetY = -scroll_progress * scroll_max_dist;
        camY = THREE.MathUtils.damp(camY, targetY, scroll_snappiness, dt);
        camera.position.y = camY;

        //handle cube rotations
        for (let c of cuboids) {
            c.rotateY(c.userData.spin * dt);
        }

        renderer.render(scene, camera);
    })


    //create animation background
    function backgroundGradient() {
        const c = document.createElement("canvas");
        c.width = 2;
        c.height = 512;
        const ctx = c.getContext("2d");
        const g = ctx.createLinearGradient(0, 0, 0, 512);
        g.addColorStop(0, "#2b1250");
        g.addColorStop(0.5, "#14082a");
        g.addColorStop(1, "#050308")
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 2, 512);
        const texture = new THREE.CanvasTexture(c);
        texture.colorSpace = THREE.SRGBColorSpace;
        return texture;
    }

    //gets the visible half extent of the viewport at the given z coordinate
    function halfExtents(z) {
        const aspect = canvas.clientWidth / canvas.clientHeight;
        const dist = camera.position.z - z;
        const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * dist;
        return { halfW: halfH * aspect, halfH: halfH };
    }

    //gets the oriented bounding box of a mesh
    function getOBB(mesh) {
        mesh.updateMatrixWorld(true);
        if (!mesh.geometry.boundingBox) {
            mesh.geometry.computeBoundingBox();
        }
        const obb = new OBB()
        obb.fromBox3(mesh.geometry.boundingBox);
        obb.applyMatrix4(mesh.matrixWorld);
        return obb;
    }

})();