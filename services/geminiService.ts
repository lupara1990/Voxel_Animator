
import { GoogleGenAI } from "@google/genai";

export const generateVoxAnimationVideo = async (
  prompt: string, 
  base64Image: string
): Promise<string | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: `A high-detailed minimalist voxel animation of ${prompt}. Smooth fluid movements, cinematic soft lighting, clean background, 4k resolution, artistic voxel aesthetic.`,
      image: {
        imageBytes: base64Image.split(',')[1],
        mimeType: 'image/png',
      },
      config: {
        numberOfVideos: 1,
        resolution: '1080p',
        aspectRatio: '16:9'
      }
    });

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 10000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) return null;

    const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error("Video Generation Error:", error);
    if (error.message?.includes("Requested entity was not found")) {
        throw new Error("RESELECT_KEY");
    }
    return null;
  }
};
