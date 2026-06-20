/** One-time Cornerstone + WADO + Tools initialization (client only). */

let initialized = false;

export async function initCornerstone() {
  if (initialized || typeof window === "undefined") return;

  const cornerstone = (await import("cornerstone-core")).default;
  const cornerstoneMath = (await import("cornerstone-math")).default;
  const cornerstoneTools = (await import("cornerstone-tools")).default;
  const cornerstoneWADOImageLoader = (await import("cornerstone-wado-image-loader")).default;
  const dicomParser = (await import("dicom-parser")).default;

  cornerstoneWADOImageLoader.external.cornerstone = cornerstone;
  cornerstoneWADOImageLoader.external.dicomParser = dicomParser;

  // Hackathon: skip web workers to avoid Next.js worker path issues
  cornerstoneWADOImageLoader.configure({ useWebWorkers: false });

  cornerstone.registerImageLoader("wadouri", cornerstoneWADOImageLoader.wadouri.loadImage);
  cornerstone.registerImageLoader("dicomweb", cornerstoneWADOImageLoader.wadors.loadImage);
  cornerstone.registerImageLoader("wadors", cornerstoneWADOImageLoader.wadors.loadImage);

  cornerstoneTools.external.cornerstone = cornerstone;
  cornerstoneTools.external.Hammer = (await import("hammerjs")).default;
  cornerstoneTools.external.cornerstoneMath = cornerstoneMath;

  cornerstoneTools.init({
    showSVGCursors: true,
    mouseEnabled: true,
  });

  cornerstoneTools.addTool(cornerstoneTools.WwwcTool);
  cornerstoneTools.addTool(cornerstoneTools.PanTool);
  cornerstoneTools.addTool(cornerstoneTools.ZoomTool);
  cornerstoneTools.addTool(cornerstoneTools.ZoomMouseWheelTool);

  initialized = true;
}

export async function getCornerstone() {
  await initCornerstone();
  const cornerstone = (await import("cornerstone-core")).default;
  const cornerstoneTools = (await import("cornerstone-tools")).default;
  const cornerstoneWADOImageLoader = (await import("cornerstone-wado-image-loader")).default;
  return { cornerstone, cornerstoneTools, cornerstoneWADOImageLoader };
}
