import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  RotateCcw, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Grid3X3, 
  Sun, 
  Moon,
  AlertCircle,
  Loader2,
  Box,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ModelViewerProps {
  modelUrl: string | null;
  format?: string;
  className?: string;
}

function disposeObject(obj: THREE.Object3D) {
  obj.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      if (child.geometry) {
        child.geometry.dispose();
      }
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((mat) => {
            disposeMaterial(mat);
          });
        } else {
          disposeMaterial(child.material);
        }
      }
    }
  });
}

function disposeMaterial(material: THREE.Material) {
  if ('map' in material && material.map instanceof THREE.Texture) {
    material.map.dispose();
  }
  if ('lightMap' in material && material.lightMap instanceof THREE.Texture) {
    material.lightMap.dispose();
  }
  if ('bumpMap' in material && material.bumpMap instanceof THREE.Texture) {
    material.bumpMap.dispose();
  }
  if ('normalMap' in material && material.normalMap instanceof THREE.Texture) {
    material.normalMap.dispose();
  }
  if ('specularMap' in material && material.specularMap instanceof THREE.Texture) {
    material.specularMap.dispose();
  }
  if ('envMap' in material && material.envMap instanceof THREE.Texture) {
    material.envMap.dispose();
  }
  material.dispose();
}

export function ModelViewer({ modelUrl, format = "glb", className }: ModelViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelRef = useRef<THREE.Group | null>(null);
  const animationIdRef = useRef<number | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [darkBackground, setDarkBackground] = useState(true);

  const supportedFormats = ["glb", "gltf"];
  const isSupported = supportedFormats.includes(format.toLowerCase());

  useEffect(() => {
    if (!containerRef.current || !modelUrl || !isSupported) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(darkBackground ? 0x1a1a2e : 0xf0f0f0);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(3, 2, 3);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 0.5;
    controls.maxDistance = 50;
    controlsRef.current = controls;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 10, 7);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(-5, 5, -5);
    scene.add(fillLight);

    if (showGrid) {
      const gridHelper = new THREE.GridHelper(10, 10, 0x444444, 0x333333);
      gridHelper.name = "gridHelper";
      scene.add(gridHelper);
    }

    setIsLoading(true);
    setError(null);

    let isMounted = true;
    const loader = new GLTFLoader();
    loader.load(
      modelUrl,
      (gltf) => {
        if (!isMounted) return;
        if (modelRef.current) {
          disposeObject(modelRef.current);
          scene.remove(modelRef.current);
        }
        
        const model = gltf.scene;
        modelRef.current = model;
        
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        model.position.sub(center);
        
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 2 / maxDim;
        model.scale.setScalar(scale);
        
        model.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        
        scene.add(model);
        
        const distance = maxDim * 2;
        camera.position.set(distance, distance * 0.7, distance);
        camera.lookAt(0, 0, 0);
        controls.target.set(0, 0, 0);
        controls.update();
        
        setIsLoading(false);
      },
      undefined,
      (err) => {
        if (!isMounted) return;
        console.error("Error loading model:", err);
        setError("Failed to load 3D model. The file may be corrupted or in an unsupported format.");
        setIsLoading(false);
      }
    );

    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      isMounted = false;
      window.removeEventListener("resize", handleResize);
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
      }
      if (modelRef.current) {
        disposeObject(modelRef.current);
        scene.remove(modelRef.current);
        modelRef.current = null;
      }
      const objectsToDispose: THREE.Object3D[] = [];
      scene.traverse((child) => {
        objectsToDispose.push(child);
      });
      objectsToDispose.forEach((child) => {
        if (child instanceof THREE.Mesh) {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach(mat => disposeMaterial(mat));
            } else {
              disposeMaterial(child.material);
            }
          }
        }
        if (child instanceof THREE.GridHelper || child instanceof THREE.LineSegments) {
          if ('geometry' in child && child.geometry) {
            (child.geometry as THREE.BufferGeometry).dispose();
          }
          if ('material' in child && child.material) {
            if (Array.isArray(child.material)) {
              (child.material as THREE.Material[]).forEach(mat => disposeMaterial(mat));
            } else {
              disposeMaterial(child.material as THREE.Material);
            }
          }
        }
      });
      scene.clear();
      if (rendererRef.current && container.contains(rendererRef.current.domElement)) {
        container.removeChild(rendererRef.current.domElement);
      }
      rendererRef.current?.dispose();
      controlsRef.current?.dispose();
      sceneRef.current = null;
      cameraRef.current = null;
      rendererRef.current = null;
      controlsRef.current = null;
    };
  }, [modelUrl, isSupported]);

  useEffect(() => {
    if (!sceneRef.current) return;
    sceneRef.current.background = new THREE.Color(darkBackground ? 0x1a1a2e : 0xf0f0f0);
  }, [darkBackground]);

  useEffect(() => {
    if (!sceneRef.current) return;
    const existingGrid = sceneRef.current.getObjectByName("gridHelper") as THREE.GridHelper | undefined;
    if (showGrid && !existingGrid) {
      const gridHelper = new THREE.GridHelper(10, 10, 0x444444, 0x333333);
      gridHelper.name = "gridHelper";
      sceneRef.current.add(gridHelper);
    } else if (!showGrid && existingGrid) {
      sceneRef.current.remove(existingGrid);
      if (existingGrid.geometry) existingGrid.geometry.dispose();
      if (existingGrid.material) {
        if (Array.isArray(existingGrid.material)) {
          existingGrid.material.forEach(mat => disposeMaterial(mat));
        } else {
          disposeMaterial(existingGrid.material);
        }
      }
    }
  }, [showGrid]);

  const handleReset = () => {
    if (!cameraRef.current || !controlsRef.current) return;
    cameraRef.current.position.set(3, 2, 3);
    cameraRef.current.lookAt(0, 0, 0);
    controlsRef.current.target.set(0, 0, 0);
    controlsRef.current.update();
  };

  const handleZoom = (direction: "in" | "out") => {
    if (!cameraRef.current) return;
    const factor = direction === "in" ? 0.8 : 1.25;
    cameraRef.current.position.multiplyScalar(factor);
  };

  if (!isSupported) {
    return (
      <Card className={cn("flex items-center justify-center", className)}>
        <CardContent className="text-center py-12">
          <Box className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">
            In-browser preview is only available for GLB/glTF formats.
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Download the {format.toUpperCase()} file to view it in compatible software.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!modelUrl) {
    return (
      <Card className={cn("flex items-center justify-center", className)}>
        <CardContent className="text-center py-12">
          <Box className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">Select a completed model to preview</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <div className="relative">
        <div 
          ref={containerRef} 
          className="w-full h-[400px]"
          data-testid="model-viewer-canvas"
        />
        
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Loading 3D model...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/90">
            <div className="text-center text-destructive">
              <AlertCircle className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        <div className="absolute bottom-3 left-3 flex gap-1">
          <Button
            size="icon"
            variant="secondary"
            className="h-8 w-8"
            onClick={handleReset}
            title="Reset view"
            data-testid="button-reset-view"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="secondary"
            className="h-8 w-8"
            onClick={() => handleZoom("in")}
            title="Zoom in"
            data-testid="button-zoom-in"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="secondary"
            className="h-8 w-8"
            onClick={() => handleZoom("out")}
            title="Zoom out"
            data-testid="button-zoom-out"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
        </div>

        <div className="absolute bottom-3 right-3 flex gap-1">
          <Button
            size="icon"
            variant={showGrid ? "default" : "secondary"}
            className="h-8 w-8"
            onClick={() => setShowGrid(!showGrid)}
            title="Toggle grid"
            data-testid="button-toggle-grid"
          >
            <Grid3X3 className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="secondary"
            className="h-8 w-8"
            onClick={() => setDarkBackground(!darkBackground)}
            title="Toggle background"
            data-testid="button-toggle-background"
          >
            {darkBackground ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
        </div>
      </div>
      <CardContent className="py-3 border-t">
        <p className="text-xs text-muted-foreground text-center">
          Click and drag to rotate. Scroll to zoom. Right-click to pan.
        </p>
      </CardContent>
    </Card>
  );
}
