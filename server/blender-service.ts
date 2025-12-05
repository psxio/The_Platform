import Anthropic from "@anthropic-ai/sdk";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import type { ModelExportFormat, ModelGenerationStatus } from "@shared/schema";

const execAsync = promisify(exec);

const anthropic = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

const MODELS_DIR = path.join(process.cwd(), "generated_models");
const SCRIPTS_DIR = path.join(process.cwd(), "blender_scripts");

if (!fs.existsSync(MODELS_DIR)) {
  fs.mkdirSync(MODELS_DIR, { recursive: true });
}
if (!fs.existsSync(SCRIPTS_DIR)) {
  fs.mkdirSync(SCRIPTS_DIR, { recursive: true });
}

const BLENDER_SYSTEM_PROMPT = `You are an expert Blender Python developer. Generate Python code for Blender that creates 3D models based on user descriptions.

RULES:
1. Always start with: import bpy
2. Clear the scene first with: bpy.ops.wm.read_factory_settings(use_empty=True)
3. Create meshes using bpy.ops.mesh.primitive_* or custom vertex/face data
4. Apply materials with proper node setups
5. Use sensible default sizes (1-5 units for most objects)
6. Name objects descriptively
7. Position objects centered at origin unless specified otherwise
8. End with a comment: # Model creation complete

MATERIAL CREATION:
- Always create materials with: mat = bpy.data.materials.new(name="MaterialName")
- Enable nodes: mat.use_nodes = True
- Access Principled BSDF: bsdf = mat.node_tree.nodes.get("Principled BSDF")
- Set colors: bsdf.inputs["Base Color"].default_value = (R, G, B, 1.0)
- Set metallic: bsdf.inputs["Metallic"].default_value = 0.0-1.0
- Set roughness: bsdf.inputs["Roughness"].default_value = 0.0-1.0
- Assign to object: obj.data.materials.append(mat)

COMMON PRIMITIVES:
- bpy.ops.mesh.primitive_cube_add(size=2, location=(0, 0, 0))
- bpy.ops.mesh.primitive_uv_sphere_add(radius=1, location=(0, 0, 0))
- bpy.ops.mesh.primitive_cylinder_add(radius=1, depth=2, location=(0, 0, 0))
- bpy.ops.mesh.primitive_cone_add(radius1=1, depth=2, location=(0, 0, 0))
- bpy.ops.mesh.primitive_torus_add(major_radius=1, minor_radius=0.25, location=(0, 0, 0))
- bpy.ops.mesh.primitive_plane_add(size=2, location=(0, 0, 0))

MODIFIERS:
- Subdivision: obj.modifiers.new(name="Subdivision", type='SUBSURF')
- Bevel: obj.modifiers.new(name="Bevel", type='BEVEL')
- Array: obj.modifiers.new(name="Array", type='ARRAY')

IMPORTANT: Output ONLY the Python code, no explanations or markdown. The code must be complete and runnable.`;

export interface BlenderJobResult {
  status: ModelGenerationStatus;
  generatedCode?: string;
  outputFilePath?: string;
  outputFileName?: string;
  fileSize?: number;
  errorMessage?: string;
  blenderLogs?: string;
  processingTimeMs?: number;
}

export async function generateBlenderCode(prompt: string): Promise<string> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 8192,
    system: BLENDER_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Create a Blender Python script that generates the following 3D model:\n\n${prompt}\n\nRemember to create appropriate materials and colors. Output ONLY the Python code.`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type === "text") {
    let code = content.text.trim();
    if (code.startsWith("```python")) {
      code = code.replace(/^```python\n?/, "").replace(/\n?```$/, "");
    } else if (code.startsWith("```")) {
      code = code.replace(/^```\n?/, "").replace(/\n?```$/, "");
    }
    return code;
  }
  throw new Error("Unexpected response type from AI");
}

function getExportCode(format: ModelExportFormat, outputPath: string): string {
  const escapedPath = outputPath.replace(/\\/g, "\\\\");
  
  switch (format) {
    case "glb":
      return `bpy.ops.export_scene.gltf(filepath="${escapedPath}", export_format="GLB")`;
    case "fbx":
      return `bpy.ops.export_scene.fbx(filepath="${escapedPath}")`;
    case "blend":
      return `bpy.ops.wm.save_as_mainfile(filepath="${escapedPath}")`;
    case "obj":
      return `bpy.ops.wm.obj_export(filepath="${escapedPath}")`;
    case "stl":
      return `bpy.ops.export_mesh.stl(filepath="${escapedPath}")`;
    default:
      return `bpy.ops.export_scene.gltf(filepath="${escapedPath}", export_format="GLB")`;
  }
}

function getFileExtension(format: ModelExportFormat): string {
  return `.${format}`;
}

export async function executeBlenderJob(
  jobId: number,
  prompt: string,
  exportFormat: ModelExportFormat,
  onStatusUpdate: (status: ModelGenerationStatus, data?: Partial<BlenderJobResult>) => void
): Promise<BlenderJobResult> {
  const startTime = Date.now();
  
  try {
    onStatusUpdate("generating_code");
    
    const generatedCode = await generateBlenderCode(prompt);
    
    onStatusUpdate("running_blender", { generatedCode });
    
    const timestamp = Date.now();
    const safePrompt = prompt.slice(0, 30).replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
    const outputFileName = `model_${safePrompt}_${timestamp}${getFileExtension(exportFormat)}`;
    const outputFilePath = path.join(MODELS_DIR, outputFileName);
    const scriptPath = path.join(SCRIPTS_DIR, `script_${jobId}_${timestamp}.py`);
    
    const fullScript = `${generatedCode}

# Export the model
${getExportCode(exportFormat, outputFilePath)}
print("BLENDER_SUCCESS: Model exported successfully")
`;

    fs.writeFileSync(scriptPath, fullScript);
    
    onStatusUpdate("exporting");
    
    const { stdout, stderr } = await execAsync(
      `blender -b --python "${scriptPath}" 2>&1`,
      { timeout: 120000 }
    );
    
    const blenderLogs = stdout + (stderr ? `\nSTDERR:\n${stderr}` : "");
    
    fs.unlinkSync(scriptPath);
    
    if (!fs.existsSync(outputFilePath)) {
      throw new Error("Blender did not produce output file. Check the generated code for errors.");
    }
    
    const stats = fs.statSync(outputFilePath);
    const processingTimeMs = Date.now() - startTime;
    
    return {
      status: "completed",
      generatedCode,
      outputFilePath,
      outputFileName,
      fileSize: stats.size,
      blenderLogs,
      processingTimeMs,
    };
  } catch (error: any) {
    const processingTimeMs = Date.now() - startTime;
    return {
      status: "failed",
      errorMessage: error.message || "Unknown error occurred",
      blenderLogs: error.stderr || error.stdout,
      processingTimeMs,
    };
  }
}

export function getModelFilePath(fileName: string): string {
  return path.join(MODELS_DIR, fileName);
}

export function modelFileExists(fileName: string): boolean {
  return fs.existsSync(path.join(MODELS_DIR, fileName));
}
