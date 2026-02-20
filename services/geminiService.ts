
/**
 * Video Export Service
 * Handles canvas recording and processing.
 */
export const exportCanvasToVideo = async (canvas: HTMLCanvasElement, duration: number) => {
  return new Promise<string>((resolve, reject) => {
    const stream = canvas.captureStream(30);
    const recorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9'
    });
    
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      resolve(URL.createObjectURL(blob));
    };
    
    recorder.start();
    setTimeout(() => {
      recorder.stop();
    }, duration * 1000);
  });
};
