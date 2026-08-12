export interface ScriptOutputFile {
  name: string;
  path: string;
  content: string | Uint8Array | Blob;
  sizeBytes?: number;
}

/**
 * Downloads a single file via browser anchor click
 */
export function downloadSingleFile(filename: string, content: string | Uint8Array | Blob) {
  const cleanName = filename.split('/').pop() || filename || 'download.txt';
  let blob: Blob;

  if (content instanceof Blob) {
    blob = content;
  } else if (content instanceof Uint8Array) {
    blob = new Blob([content.buffer as ArrayBuffer], { type: 'application/octet-stream' });
  } else {
    blob = new Blob([String(content)], { type: 'text/plain;charset=utf-8' });
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = cleanName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Dynamically loads JSZip via ESM CDN and downloads multiple files as a single .zip package
 */
export async function downloadFilesAsZip(
  files: ScriptOutputFile[],
  zipFilename: string = 'script_output_files.zip'
): Promise<void> {
  try {
    const cdnUrl = 'https://esm.sh/jszip';
    const JSZipModule = await import(/* @vite-ignore */ cdnUrl);
    const JSZip = JSZipModule.default || JSZipModule;
    const zip = new JSZip();

    for (const file of files) {
      const cleanPath = file.path.startsWith('/') ? file.path.slice(1) : file.path;
      zip.file(cleanPath || file.name, file.content);
    }

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = zipFilename.endsWith('.zip') ? zipFilename : `${zipFilename}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (err) {
    console.error('Failed to create ZIP package with JSZip, downloading files individually:', err);
    for (const file of files) {
      downloadSingleFile(file.name, file.content);
    }
  }
}

/**
 * Parses execution raw result payload to extract any structured file objects returned by run()
 */
export function extractFileObjectsFromReturn(rawResult: any): ScriptOutputFile[] {
  if (!rawResult) return [];

  const results: ScriptOutputFile[] = [];

  const checkItem = (item: any) => {
    if (!item || typeof item !== 'object') return;

    const name = item.name || item.filename || item.fileName || item.title || item.path;
    const content = item.content !== undefined ? item.content : item.data !== undefined ? item.data : item.text;

    if (name && content !== undefined && typeof name === 'string') {
      const strContent = typeof content === 'object' ? JSON.stringify(content, null, 2) : String(content);
      results.push({
        name: name.split('/').pop() || name,
        path: name,
        content: strContent,
        sizeBytes: strContent.length
      });
    }
  };

  if (Array.isArray(rawResult)) {
    rawResult.forEach(checkItem);
  } else if (typeof rawResult === 'object') {
    if (Array.isArray(rawResult.files)) {
      rawResult.files.forEach(checkItem);
    } else if (Array.isArray(rawResult.outputs)) {
      rawResult.outputs.forEach(checkItem);
    } else {
      checkItem(rawResult);
    }
  }

  return results;
}
