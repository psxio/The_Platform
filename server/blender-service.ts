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
  const escapedPath = outputPath.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  
  switch (format) {
    case "glb":
      return `
# Ensure glTF exporter is enabled
import addon_utils
addon_utils.enable("io_scene_gltf2", default_set=True)

# Select all mesh objects for export
bpy.ops.object.select_all(action='DESELECT')
for obj in bpy.data.objects:
    if obj.type == 'MESH':
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj

# Export as GLB
bpy.ops.export_scene.gltf(
    filepath="${escapedPath}",
    export_format="GLB",
    use_selection=False,
    export_apply=True
)`;
    case "fbx":
      return `bpy.ops.export_scene.fbx(filepath="${escapedPath}", use_selection=False)`;
    case "blend":
      return `bpy.ops.wm.save_as_mainfile(filepath="${escapedPath}")`;
    case "obj":
      return `bpy.ops.wm.obj_export(filepath="${escapedPath}")`;
    case "stl":
      return `
# Select all mesh objects for STL export
bpy.ops.object.select_all(action='DESELECT')
for obj in bpy.data.objects:
    if obj.type == 'MESH':
        obj.select_set(True)
bpy.ops.export_mesh.stl(filepath="${escapedPath}", use_selection=True)`;
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
  let generatedCode = "";
  let scriptPath = "";
  
  try {
    onStatusUpdate("generating_code");
    
    generatedCode = await generateBlenderCode(prompt);
    
    onStatusUpdate("running_blender", { generatedCode });
    
    const timestamp = Date.now();
    const safePrompt = prompt.slice(0, 30).replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
    const outputFileName = `model_${safePrompt}_${timestamp}${getFileExtension(exportFormat)}`;
    const outputFilePath = path.join(MODELS_DIR, outputFileName);
    scriptPath = path.join(SCRIPTS_DIR, `script_${jobId}_${timestamp}.py`);
    
    const fullScript = `import bpy
import sys
import traceback

try:
${generatedCode.split('\n').map(line => '    ' + line).join('\n')}

    # Export the model
${getExportCode(exportFormat, outputFilePath).split('\n').map(line => '    ' + line).join('\n')}
    
    print("BLENDER_SUCCESS: Model exported successfully to ${outputFilePath}")
except Exception as e:
    print(f"BLENDER_ERROR: {str(e)}")
    traceback.print_exc()
    sys.exit(1)
`;

    fs.writeFileSync(scriptPath, fullScript);
    console.log(`[Blender] Script written to ${scriptPath}`);
    console.log(`[Blender] Output will be saved to ${outputFilePath}`);
    
    onStatusUpdate("exporting");
    
    let stdout = "";
    let stderr = "";
    
    try {
      const result = await execAsync(
        `blender -b -noaudio --python "${scriptPath}" 2>&1`,
        { 
          timeout: 180000,
          maxBuffer: 10 * 1024 * 1024,
          env: { ...process.env, BLENDER_USER_SCRIPTS: "" }
        }
      );
      stdout = result.stdout || "";
      stderr = result.stderr || "";
    } catch (execError: any) {
      stdout = execError.stdout || "";
      stderr = execError.stderr || "";
      console.error("[Blender] Execution error:", execError.message);
    }
    
    const blenderLogs = stdout + (stderr ? `\n--- STDERR ---\n${stderr}` : "");
    console.log(`[Blender] Logs preview: ${blenderLogs.slice(0, 500)}...`);
    
    if (fs.existsSync(scriptPath)) {
      fs.unlinkSync(scriptPath);
    }
    
    if (!fs.existsSync(outputFilePath)) {
      const errorMatch = blenderLogs.match(/BLENDER_ERROR: (.+)/);
      const pythonError = blenderLogs.match(/Error: (.+)/);
      const tracebackMatch = blenderLogs.match(/Traceback[\s\S]*?(?=\n\n|$)/);
      
      let errorMessage = "Blender did not produce output file.";
      if (errorMatch) {
        errorMessage += ` Error: ${errorMatch[1]}`;
      } else if (pythonError) {
        errorMessage += ` Error: ${pythonError[1]}`;
      }
      if (tracebackMatch) {
        errorMessage += ` Details: ${tracebackMatch[0].slice(0, 200)}`;
      }
      
      return {
        status: "failed",
        generatedCode,
        errorMessage,
        blenderLogs,
        processingTimeMs: Date.now() - startTime,
      };
    }
    
    const stats = fs.statSync(outputFilePath);
    const processingTimeMs = Date.now() - startTime;
    
    console.log(`[Blender] Success! File size: ${stats.size} bytes, Time: ${processingTimeMs}ms`);
    
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
    console.error("[Blender] Job failed:", error);
    
    if (scriptPath && fs.existsSync(scriptPath)) {
      try {
        fs.unlinkSync(scriptPath);
      } catch {}
    }
    
    const processingTimeMs = Date.now() - startTime;
    return {
      status: "failed",
      generatedCode: generatedCode || undefined,
      errorMessage: error.message || "Unknown error occurred",
      blenderLogs: error.stderr || error.stdout || undefined,
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

export async function testBlenderHealth(): Promise<{ ok: boolean; version?: string; error?: string }> {
  try {
    const { stdout } = await execAsync("blender -b -noaudio --version", { timeout: 10000 });
    const versionMatch = stdout.match(/Blender (\d+\.\d+\.\d+)/);
    return { ok: true, version: versionMatch ? versionMatch[1] : "unknown" };
  } catch (error: any) {
    return { ok: false, error: error.message };
  }
}
